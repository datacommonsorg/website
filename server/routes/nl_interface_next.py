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

import os
import logging
import json

import flask
from flask import Blueprint, current_app, render_template, escape, request
from google.protobuf.json_format import MessageToJson, ParseDict
from lib.nl.nl_detection import ClassificationType, Detection, NLClassifier, Place, PlaceDetection, SVDetection, SimpleClassificationAttributes, RANKED_CLASSIFICATION_TYPES
from typing import Dict, List
import requests

import services.datacommons as dc
import lib.nl.nl_data_spec_next as nl_data_spec
import lib.nl.nl_page_config_next as nl_page_config
import lib.nl.nl_utterance as nl_utterance
import lib.nl.nl_utils as nl_utils

bp = Blueprint('nl_next', __name__, url_prefix='/nlnext')

MAPS_API = "https://maps.googleapis.com/maps/api/place/textsearch/json?"


def _get_preferred_type(types):
  for t in ['Country', 'State', 'County', 'City']:
    if t in types:
      return t
  return sorted(types)[0]


def _maps_place(place_str):
  api_key = current_app.config["MAPS_API_KEY"]
  url_formatted = f"{MAPS_API}input={place_str}&key={api_key}"
  r = requests.get(url_formatted)
  resp = r.json()

  # Return the first "political" place found.
  if "results" in resp:
    for res in resp["results"]:
      if "political" in res["types"]:
        return res
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
  if not places_found:
    return ""

  place_dcid = ""
  place = _maps_place(places_found[0])
  # If maps API returned a valid place, use the place_id to
  # get the dcid.
  if place and ("place_id" in place):
    place_id = place["place_id"]
    logging.info(f"MAPS API found place with place_id: {place_id}")
    place_ids_map = _dc_recon([place_id])

    if place_id in place_ids_map:
      place_dcid = place_ids_map[place_id]

  logging.info(f"DC API found DCID: {place_dcid}")
  return place_dcid


def _empty_svs_score_dict():
  return {"SV": [], "CosineScore": [], "SV_to_Sentences": {}}


def _result_with_debug_info(data_dict, status, embeddings_build,
                            query_detection: Detection,
                            context_history: List[Dict]):
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
  temporal_classification = "<None>"
  contained_in_classification = "<None>"
  correlation_classification = "<None>"
  clustering_classification = "<None>"

  for classification in query_detection.classifications:
    if classification.type == ClassificationType.RANKING:
      ranking_classification = str(classification.attributes.ranking_type)
    elif classification.type == ClassificationType.TEMPORAL:
      temporal_classification = str(classification.type)
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

  # TODO: Revisit debug info to add places and variables in context
  # TODO: Add SVs that were actually used
  debug_info = {
      'status': status,
      'original_query': query_detection.original_query,
      'sv_matching': svs_dict,
      'svs_to_sentences': svs_to_sentences,
      'embeddings_build': embeddings_build,
      'ranking_classification': ranking_classification,
      'temporal_classification': temporal_classification,
      'contained_in_classification': contained_in_classification,
      'clustering_classification': clustering_classification,
      'correlation_classification': correlation_classification,
      'data_spec': context_history,
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


def _detection(orig_query, cleaned_query, embeddings_build) -> Detection:
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
    query = _remove_places(cleaned_query, places_found)

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
    place_detection = None

  # Step 3: Identify the SV matched based on the query.
  svs_scores_dict = _empty_svs_score_dict()
  try:
    svs_scores_dict = model.detect_svs(query, embeddings_build)
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
  temporal_classification = model.query_classification("temporal", query)
  contained_in_classification = model.query_classification(
      "contained_in", query)
  logging.info(f'Ranking classification: {ranking_classification}')
  logging.info(f'Temporal classification: {temporal_classification}')
  logging.info(f'ContainedIn classification: {contained_in_classification}')

  # Set the Classifications list.
  classifications = []
  if ranking_classification is not None:
    classifications.append(ranking_classification)
  if contained_in_classification is not None:
    classifications.append(contained_in_classification)

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
                   query_type=_query_type_from_classifications(classifications),
                   classifications=classifications)


def _query_type_from_classifications(classifications):
  ans = ClassificationType.SIMPLE
  for cl in classifications:
    if (_classification_rank_order(cl.type) > _classification_rank_order(ans)):
      ans = cl.type
  return ans


def _classification_rank_order(cl: ClassificationType) -> int:
  if cl in RANKED_CLASSIFICATION_TYPES:
    return RANKED_CLASSIFICATION_TYPES.index(cl) + 1
  else:
    return 0


@bp.route('/', strict_slashes=True)
def page():
  if (os.environ.get('FLASK_ENV') == 'production' or
      not current_app.config['NL_MODEL']):
    flask.abort(404)
  return render_template('/nl_interface.html',
                         maps_api_key=current_app.config['MAPS_API_KEY'])


#
# The main Data Handler function
#
@bp.route('/data', methods=['GET', 'POST'])
def data():
  """Data handler."""
  if (os.environ.get('FLASK_ENV') == 'production' or
      not current_app.config['NL_MODEL']):
    flask.abort(404)
  original_query = request.args.get('q')
  context_history = request.get_json().get('contextHistory', [])
  escaped_context_history = escape(context_history)
  logging.info(context_history)

  query = str(escape(nl_utils.remove_punctuations(original_query)))
  embeddings_build = str(escape(request.args.get('build', "combined_all")))
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
                                   embeddings_build,
                                   _detection("", "", embeddings_build),
                                   escaped_context_history)

  # Query detection routine:
  # Returns detection for Place, SVs and Query Classifications.
  query_detection = _detection(str(escape(original_query)), query,
                               embeddings_build)

  # Generate new utterance.
  prev_utterance = nl_utterance.load_utterance(context_history)
  logging.info(prev_utterance)
  utterance = nl_data_spec.compute(query_detection, prev_utterance)

  if utterance.rankedCharts:
    page_config_pb = nl_page_config.build_page_config(utterance)
    page_config = json.loads(MessageToJson(page_config_pb))
    # Use the first chart's place as main place.
    main_place = utterance.rankedCharts[0].places[0]
  else:
    page_config = {}
    main_place = Place(dcid='', name='', place_type='')
    logging.info('Found empty place for query "%s"',
                 query_detection.original_query)

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

  data_dict = _result_with_debug_info(data_dict, status_str, embeddings_build,
                                      query_detection, context_history)
  return data_dict
