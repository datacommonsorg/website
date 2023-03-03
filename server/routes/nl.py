# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Data Commons NL Interface routes"""

import asyncio
import json
import logging
import os
from typing import Dict, List

import flask
from flask import Blueprint
from flask import current_app
from flask import escape
from flask import g
from flask import render_template
from flask import request
from google.protobuf.json_format import MessageToJson
import requests

import server.lib.nl.constants as constants
from server.lib.nl.detection import ClassificationType
from server.lib.nl.detection import Detection
from server.lib.nl.detection import NLClassifier
from server.lib.nl.detection import Place
from server.lib.nl.detection import PlaceDetection
from server.lib.nl.detection import SimpleClassificationAttributes
from server.lib.nl.detection import SVDetection
import server.lib.nl.fulfiller as fulfillment
import server.lib.nl.fulfillment.context as context
import server.lib.nl.page_config_builder as nl_page_config
import server.lib.nl.utils as utils
import server.lib.nl.utterance as nl_utterance
from server.lib.util import get_disaster_dashboard_configs
import server.services.bigtable as bt
import server.services.datacommons as dc

bp = Blueprint('nl', __name__, url_prefix='/nl')


def _get_preferred_type(types):
  for t in ['Country', 'State', 'County', 'City']:
    if t in types:
      return t
  return sorted(types)[0]


def _maps_place(place_str):
  if place_str.lower() in constants.SPECIAL_PLACE_REPLACEMENTS:
    logging.info(f"place_str {place_str} matched a special place.")
    place_str = constants.SPECIAL_PLACE_REPLACEMENTS[place_str.lower()]
    logging.info(f"place_str replaced with: {place_str}")

  api_key = current_app.config["MAPS_API_KEY"]
  # Note on 03/01/2023: switching to use the Maps Autocomplete API.
  url_formatted = f"{constants.MAPS_API}input={place_str}&key={api_key}&types={constants.AUTOCOMPLETE_MAPS_API_TYPES_FILTER}"
  r = requests.get(url_formatted)
  resp = r.json()

  # Return the first place found which has a type matching MAPS_GEO_TYPES.
  if "predictions" in resp:
    for res in resp["predictions"]:
      types_found = set(res["types"])

      if constants.MAPS_GEO_TYPES.intersection(types_found):
        return res

  logging.info(
      f"Maps API did not find a result of type in: {constants.MAPS_GEO_TYPES}. Query URL: {url_formatted}. Response: {resp}"
  )
  return {}


def _dc_recon(place_ids):
  resp = dc.resolve_id(place_ids, "placeId", "dcid")
  if "entities" not in resp:
    return {}

  d_return = {}
  for ent in resp["entities"]:
    for out in ent["outIds"]:
      d_return[ent["inId"]] = out
      break

  return d_return


def _remove_places(query, places_found):
  for p_str in places_found:
    # See if the word "in" precedes the place. If so, best to remove it too.
    needle = "in " + p_str
    if needle not in query:
      needle = p_str
    query = query.replace(needle, "")

  # Remove any extra spaces and return.
  return ' '.join(query.split())


def _infer_place_dcid(places_found):
  # TODO: propagate several of the logging errors in this function to place detection
  # state displayed in debugInfo.
  if not places_found:
    logging.info("places_found is empty. Nothing to retrieve from Maps API.")
    return ""

  place_dcid = ""
  # Iterate over all the places until a valid place DCID is found.
  for p_str in places_found:
    # If this is a special place, return the known DCID.
    if p_str.lower() in constants.OVERRIDE_PLACE_TO_DICD_FOR_MAPS_API:
      place_dcid = constants.OVERRIDE_PLACE_TO_DICD_FOR_MAPS_API[p_str.lower()]
      logging.info(
          f"{p_str} was found in OVERRIDE_PLACE_TO_DICD_FOR_MAPS_API. Returning its DICD {place_dcid} without querying Maps API."
      )
      break

    logging.info(f"Searching Maps API with: {p_str}")
    place = _maps_place(p_str)
    # If maps API returned a valid place, use the place_id to
    # get the dcid.
    if place and ("place_id" in place):
      place_id = place["place_id"]
      logging.info(
          f"MAPS API found place with place_id: {place_id} for place string: {p_str}."
      )
      place_ids_map = _dc_recon([place_id])

      if place_id in place_ids_map:
        place_dcid = place_ids_map[place_id]
        logging.info(f"DC API found DCID: {place_dcid}")
        break
      else:
        logging.info(
            f"Maps API found a place {place_id} but no DCID match found for place string: {p_str}."
        )
    else:
      logging.info("Maps API did not find a place for place string: {p_str}.")

  if not place_dcid:
    logging.info(
        f"No place DCIDs were found. Using places_found = {places_found}")
  return place_dcid


def _empty_svs_score_dict():
  return {"SV": [], "CosineScore": [], "SV_to_Sentences": {}}


def _result_with_debug_info(data_dict: Dict, status: str,
                            query_detection: Detection,
                            uttr_history: List[Dict],
                            debug_counters: Dict) -> Dict:
  """Using data_dict and query_detection, format the dictionary response."""
  svs_dict = {
      'SV': query_detection.svs_detected.sv_dcids,
      'CosineScore': query_detection.svs_detected.sv_scores,
      'SV_to_Sentences': query_detection.svs_detected.svs_to_sentences
  }
  svs_to_sentences = query_detection.svs_detected.svs_to_sentences

  if svs_dict is None or not svs_dict:
    svs_dict = _empty_svs_score_dict()

  ranking_classification = "<None>"
  overview_classification = "<None>"
  size_type_classification = "<None>"
  time_delta_classification = "<None>"
  comparison_classification = "<None>"
  contained_in_classification = "<None>"
  correlation_classification = "<None>"
  clustering_classification = "<None>"
  event_classification = "<None>"

  for classification in query_detection.classifications:
    if classification.type == ClassificationType.RANKING:
      ranking_classification = str(classification.attributes.ranking_type)
    elif classification.type == ClassificationType.OVERVIEW:
      overview_classification = str(classification.type)
    elif classification.type == ClassificationType.SIZE_TYPE:
      size_type_classification = str(classification.attributes.size_types)
    elif classification.type == ClassificationType.TIME_DELTA:
      time_delta_classification = str(
          classification.attributes.time_delta_types)
    elif classification.type == ClassificationType.EVENT:
      event_classification = str(classification.attributes.event_types)
    elif classification.type == ClassificationType.COMPARISON:
      comparison_classification = str(classification.type)
    elif classification.type == ClassificationType.CONTAINED_IN:
      contained_in_classification = str(classification.type)
      contained_in_classification = \
          str(classification.attributes.contained_in_place_type)
    elif classification.type == ClassificationType.CORRELATION:
      correlation_classification = str(classification.type)
    elif classification.type == ClassificationType.CLUSTERING:
      clustering_classification = str(classification.type)
      clustering_classification += f". Top two SVs: "
      clustering_classification += f"{classification.attributes.sv_dcid_1, classification.attributes.sv_dcid_2,}. "
      clustering_classification += f"Cluster # 0: {str(classification.attributes.cluster_1_svs)}. "
      clustering_classification += f"Cluster # 1: {str(classification.attributes.cluster_2_svs)}."

  debug_info = {
      'status': status,
      'original_query': query_detection.original_query,
      'sv_matching': svs_dict,
      'svs_to_sentences': svs_to_sentences,
      'ranking_classification': ranking_classification,
      'overview_classification': overview_classification,
      'size_type_classification': size_type_classification,
      'time_delta_classification': time_delta_classification,
      'contained_in_classification': contained_in_classification,
      'clustering_classification': clustering_classification,
      'comparison_classification': comparison_classification,
      'correlation_classification': correlation_classification,
      'event_classification': event_classification,
      'counters': debug_counters,
      'data_spec': uttr_history,
  }
  if query_detection.places_detected:
    debug_info.update({
        'places_detected':
            query_detection.places_detected.places_found,
        'main_place_dcid':
            query_detection.places_detected.main_place.dcid,
        'main_place_name':
            query_detection.places_detected.main_place.name,
        'query_with_places_removed':
            query_detection.places_detected.query_without_place_substr,
    })
  else:
    debug_info.update({
        'places_detected': ["<None>"],
        'main_place_dcid': "<None>",
        'main_place_name': "<None>",
        'query_with_places_removed': query_detection.original_query,
    })
  data_dict['debug'] = debug_info
  return data_dict


def _detection(orig_query, cleaned_query) -> Detection:
  model = current_app.config['NL_MODEL']

  # Step 1: find all relevant places and the name/type of the main place found.
  places_found = model.detect_place(cleaned_query)

  if not places_found:
    logging.info("Place detection failed.")

  logging.info("Found places: {}".format(places_found))
  # If place_dcid was already set by the url, skip inferring it.
  place_dcid = request.args.get('place_dcid', '')
  if not place_dcid and places_found:
    place_dcid = _infer_place_dcid(places_found)

  if place_dcid:
    place_types = dc.property_values([place_dcid], 'typeOf')[place_dcid]
    main_place_type = _get_preferred_type(place_types)
    main_place_name = dc.property_values([place_dcid], 'name')[place_dcid][0]

    # Step 2: replace the places in the query sentence with "".
    query = _remove_places(cleaned_query.lower(), places_found)

    # Set PlaceDetection.
    place_detection = PlaceDetection(query_original=orig_query,
                                     query_without_place_substr=query,
                                     places_found=places_found,
                                     main_place=Place(
                                         dcid=place_dcid,
                                         name=main_place_name,
                                         place_type=main_place_type))
  else:
    query = cleaned_query
    # TODO: even if no place_dcid was found, debugInfo should be able to display
    # the places_found (which can be valid even if no dcid was found).
    place_detection = None

  # Step 3: Identify the SV matched based on the query.
  svs_scores_dict = _empty_svs_score_dict()
  try:
    svs_scores_dict = model.detect_svs(query)
  except ValueError as e:
    logging.info(e)
    logging.info("Using an empty svs_scores_dict")

  # Set the SVDetection.
  sv_detection = SVDetection(
      query=query,
      sv_dcids=svs_scores_dict['SV'],
      sv_scores=svs_scores_dict['CosineScore'],
      svs_to_sentences=svs_scores_dict['SV_to_Sentences'])

  # Step 4: find query classifiers.
  ranking_classification = model.heuristic_ranking_classification(query)
  comparison_classification = model.heuristic_comparison_classification(query)
  overview_classification = model.heuristic_overview_classification(query)
  size_type_classification = model.heuristic_size_type_classification(query)
  time_delta_classification = model.heuristic_time_delta_classification(query)
  contained_in_classification = model.heuristic_containedin_classification(
      query)
  event_classification = model.heuristic_event_classification(query)
  logging.info(f'Ranking classification: {ranking_classification}')
  logging.info(f'Comparison classification: {comparison_classification}')
  logging.info(f'SizeType classification: {size_type_classification}')
  logging.info(f'TimeDelta classification: {time_delta_classification}')
  logging.info(f'ContainedIn classification: {contained_in_classification}')
  logging.info(f'Event Classification: {event_classification}')
  logging.info(f'Overview classification: {overview_classification}')

  # Set the Classifications list.
  classifications = []
  if ranking_classification is not None:
    classifications.append(ranking_classification)
  if comparison_classification is not None:
    classifications.append(comparison_classification)
  if contained_in_classification is not None:
    classifications.append(contained_in_classification)
  if size_type_classification is not None:
    classifications.append(size_type_classification)
  if time_delta_classification is not None:
    classifications.append(time_delta_classification)
  if event_classification is not None:
    classifications.append(event_classification)
  if overview_classification is not None:
    classifications.append(overview_classification)

  # Correlation classification
  correlation_classification = model.heuristic_correlation_classification(query)
  logging.info(f'Correlation classification: {correlation_classification}')
  if correlation_classification is not None:
    classifications.append(correlation_classification)

  if not classifications:
    # if not classification is found, it should default to UNKNOWN (not SIMPLE)
    classifications.append(
        NLClassifier(type=ClassificationType.UNKNOWN,
                     attributes=SimpleClassificationAttributes()))

  return Detection(original_query=orig_query,
                   cleaned_query=cleaned_query,
                   places_detected=place_detection,
                   svs_detected=sv_detection,
                   classifications=classifications)


@bp.route('/')
def page():
  if (os.environ.get('FLASK_ENV') == 'production' or
      not current_app.config['NL_MODEL']):
    flask.abort(404)
  placeholder_query = ''
  # TODO: Make this more customizable for all custom DC's
  if g.env == 'climate_trace':
    placeholder_query = 'Greenhouse gas emissions in USA'
  return render_template('/nl_interface.html',
                         maps_api_key=current_app.config['MAPS_API_KEY'],
                         placeholder_query=placeholder_query,
                         website_hash=os.environ.get("WEBSITE_HASH"))


#
# The main Data Handler function
#
@bp.route('/data', methods=['POST'])
def data():
  """Data handler."""
  if (os.environ.get('FLASK_ENV') == 'production' or
      not current_app.config['NL_MODEL']):
    flask.abort(404)

  # TODO: Switch to NL-specific event configs instead of relying
  # on disaster dashboard's.
  disaster_configs = current_app.config['DISASTER_DASHBOARD_CONFIGS']
  if current_app.config['LOCAL']:
    # Reload configs for faster local iteration.
    disaster_configs = get_disaster_dashboard_configs()
  disaster_config = None
  if disaster_configs:
    disaster_config = disaster_configs[0]
  else:
    logging.error('Unable to load event configs!')

  original_query = request.args.get('q')
  context_history = []
  escaped_context_history = []
  if request.get_json():
    context_history = request.get_json().get('contextHistory', [])
    escaped_context_history = escape(context_history)

  query = str(escape(utils.remove_punctuations(original_query)))
  res = {
      'place': {
          'dcid': '',
          'name': '',
          'place_type': '',
      },
      'config': {},
      'context': escaped_context_history
  }
  if not query:
    logging.info("Query was empty")
    return _result_with_debug_info(res, "Aborted: Query was Empty.",
                                   _detection("", ""), escaped_context_history,
                                   {})

  # Query detection routine:
  # Returns detection for Place, SVs and Query Classifications.
  query_detection = _detection(str(escape(original_query)), query)

  # Generate new utterance.
  prev_utterance = nl_utterance.load_utterance(context_history)
  if prev_utterance:
    session_id = prev_utterance.session_id
  else:
    if current_app.config['LOG_QUERY']:
      session_id = utils.new_session_id()
    else:
      session_id = constants.TEST_SESSION_ID

  utterance = fulfillment.fulfill(query_detection, prev_utterance, session_id)

  if utterance.rankedCharts:
    page_config_pb = nl_page_config.build_page_config(utterance,
                                                      disaster_config)
    page_config = json.loads(MessageToJson(page_config_pb))
    # Use the first chart's place as main place.
    main_place = utterance.rankedCharts[0].places[0]
  else:
    page_config = {}
    main_place = Place(dcid='', name='', place_type='')
    logging.info('Found empty place for query "%s"',
                 query_detection.original_query)

  dbg_counters = utterance.counters
  utterance.counters = None
  context_history = nl_utterance.save_utterance(utterance)

  data_dict = {
      'place': {
          'dcid': main_place.dcid,
          'name': main_place.name,
          'place_type': main_place.place_type,
      },
      'config': page_config,
      'context': context_history
  }
  status_str = "Successful"
  if utterance.rankedCharts:
    status_str = ""
  else:
    if not utterance.places:
      status_str += '**No Place Found**.'
    if not utterance.svs:
      status_str += '**No SVs Found**.'

  if current_app.config['LOG_QUERY']:
    # Asynchronously log as bigtable write takes O(100ms)
    loop = asyncio.new_event_loop()
    session_info = context.get_session_info(context_history)
    loop.run_until_complete(bt.write_row(session_info))

  data_dict = _result_with_debug_info(data_dict, status_str, query_detection,
                                      context_history, dbg_counters)

  return data_dict


@bp.route('/history')
def history():
  if (os.environ.get('FLASK_ENV') == 'production' or
      not current_app.config['NL_MODEL']):
    flask.abort(404)
  return json.dumps(bt.read_success_rows())
