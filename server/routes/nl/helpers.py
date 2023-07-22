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

import asyncio
import json
import logging
import os
import time
from typing import Dict

import flask
from flask import current_app
from google.protobuf.json_format import MessageToJson
from markupsafe import escape

from server.lib.nl.common import bad_words
import server.lib.nl.common.constants as constants
import server.lib.nl.common.counters as ctr
import server.lib.nl.common.debug_utils as dbg
import server.lib.nl.common.utils as utils
import server.lib.nl.common.utterance as nl_utterance
import server.lib.nl.config_builder.builder as config_builder
from server.lib.nl.detection import utils as dutils
import server.lib.nl.detection.detector as detector
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import PlaceDetectorType
from server.lib.nl.detection.types import RequestedDetectorType
from server.lib.nl.detection.utils import create_utterance
import server.lib.nl.fulfillment.context as context
import server.lib.nl.fulfillment.fulfiller as fulfillment
from server.lib.util import get_nl_disaster_config
from server.routes.nl import helpers
import server.services.bigtable as bt
import shared.lib.utils as shared_utils


#
# Given a request parses the query and other params and
# detects stuff into a Detection object.
#
def parse_query_and_detect(request: Dict, debug_logs: Dict):
  # NO production support yet.
  if os.environ.get('FLASK_ENV') == 'production':
    flask.abort(404)

  if not current_app.config.get('NL_BAD_WORDS'):
    logging.error('Missing NL_BAD_WORDS config!')
    flask.abort(404)
  nl_bad_words = current_app.config['NL_BAD_WORDS']

  # Index-type default is in nl_server.
  embeddings_index_type = request.args.get('idx', '')
  original_query = request.args.get('q')
  context_history = []
  if request.get_json():
    context_history = request.get_json().get('contextHistory', [])

  detector_type = request.args.get('detector',
                                   default=RequestedDetectorType.Hybrid.value,
                                   type=str)

  place_detector_type = request.args.get('place_detector',
                                         default='dc',
                                         type=str).lower()
  if place_detector_type not in [PlaceDetectorType.NER, PlaceDetectorType.DC]:
    logging.error(f'Unknown place_detector {place_detector_type}')
    place_detector_type = PlaceDetectorType.NER
  else:
    place_detector_type = PlaceDetectorType(place_detector_type)

  query = str(escape(shared_utils.remove_punctuations(original_query)))
  if not query:
    err_json = helpers.abort(
        'Received an empty query, please type a few words :)', original_query,
        context_history)
    return None, err_json

  #
  # Check offensive words
  #
  if (not bad_words.is_safe(original_query, nl_bad_words) or
      not bad_words.is_safe(query, nl_bad_words)):
    err_json = helpers.abort(
        'The query was rejected due to the ' +
        'presence of inappropriate words.', original_query, context_history)
    return None, err_json

  counters = ctr.Counters()
  debug_logs["original_query"] = query

  # Generate new utterance.
  prev_utterance = nl_utterance.load_utterance(context_history)
  if prev_utterance:
    session_id = prev_utterance.session_id
  else:
    if current_app.config['LOG_QUERY']:
      session_id = utils.new_session_id()
    else:
      session_id = constants.TEST_SESSION_ID

  # Query detection routine:
  # Returns detection for Place, SVs and Query Classifications.
  start = time.time()
  query_detection = detector.detect(detector_type, place_detector_type,
                                    original_query, query, prev_utterance,
                                    embeddings_index_type, debug_logs, counters)
  counters.timeit('query_detection', start)

  utterance = create_utterance(query_detection, prev_utterance, counters,
                               session_id)

  return utterance, None


#
# Given an utterance constructed either from a query or from dcids,
# fulfills it into charts.
#
def fulfill_with_chart_config(utterance: nl_utterance.Utterance,
                              debug_logs: Dict) -> Dict:
  disaster_config = current_app.config['NL_DISASTER_CONFIG']
  if current_app.config['LOCAL']:
    # Reload configs for faster local iteration.
    disaster_config = get_nl_disaster_config()
  else:
    logging.info('Unable to load event configs!')

  cb_config = config_builder.Config(
      event_config=disaster_config,
      sv_chart_titles=current_app.config['NL_CHART_TITLES'],
      nopc_vars=current_app.config['NL_NOPC_VARS'])

  start = time.time()
  utterance = fulfillment.fulfill(utterance)
  utterance.counters.timeit('fulfillment', start)

  if utterance.rankedCharts:
    start = time.time()

    # Call chart config builder.
    page_config_pb = config_builder.build(utterance, cb_config)

    page_config = json.loads(MessageToJson(page_config_pb))
    utterance.counters.timeit('build_page_config', start)

    # Use the first chart's place as main place.
    main_place = utterance.rankedCharts[0].places[0]
  else:
    page_config = {}
    utterance.place_source = nl_utterance.FulfillmentResult.UNRECOGNIZED
    main_place = Place(dcid='', name='', place_type='')
    logging.info('Found empty place for query "%s"',
                 utterance.detection.original_query)

  dbg_counters = utterance.counters.get()
  utterance.counters = None
  context_history = nl_utterance.save_utterance(utterance)

  data_dict = {
      'place': {
          'dcid': main_place.dcid,
          'name': main_place.name,
          'place_type': main_place.place_type,
      },
      'config': page_config,
      'context': context_history,
      'placeFallback': context_history[0]['placeFallback'],
      'svSource': utterance.sv_source.value,
      'placeSource': utterance.place_source.value,
      'pastSourceContext': utterance.past_source_context,
  }
  status_str = "Successful"
  if utterance.rankedCharts:
    status_str = ""
  else:
    if not utterance.places:
      status_str += '**No Place Found**.'
    if not utterance.svs:
      status_str += '**No SVs Found**.'

  return prepare_response(data_dict, status_str, utterance.detection,
                          dbg_counters, debug_logs)


def prepare_response(data_dict: Dict, status_str: str, detection: Detection,
                     dbg_counters: Dict, debug_logs: Dict) -> Dict:
  data_dict = dbg.result_with_debug_info(data_dict, status_str, detection,
                                         dbg_counters, debug_logs)
  # Convert data_dict to pure json.
  data_dict = utils.to_dict(data_dict)
  if current_app.config['LOG_QUERY']:
    # Asynchronously log as bigtable write takes O(100ms)
    loop = asyncio.new_event_loop()
    session_info = context.get_session_info(data_dict['context'])
    data_dict['session'] = session_info
    loop.run_until_complete(bt.write_row(session_info, data_dict, dbg_counters))

  return data_dict


#
# Preliminary abort with the given error message
#
def abort(error_message: str, original_query: str,
          context_history: Dict) -> Dict:
  query = str(escape(shared_utils.remove_punctuations(original_query)))
  escaped_context_history = []
  for ch in context_history:
    escaped_context_history.append(escape(ch))

  res = {
      'place': {
          'dcid': '',
          'name': '',
          'place_type': '',
      },
      'config': {},
      'context': escaped_context_history,
      'failure': error_message
  }

  counters = ctr.Counters()
  query_detection_debug_logs = {}
  query_detection_debug_logs["original_query"] = query

  query_detection = Detection(original_query=original_query,
                              cleaned_query=query,
                              places_detected=dutils.empty_place_detection(),
                              svs_detected=dutils.create_sv_detection(
                                  query, dutils.empty_svs_score_dict()),
                              classifications=[],
                              llm_resp={})
  data_dict = dbg.result_with_debug_info(
      data_dict=res,
      status=error_message,
      query_detection=query_detection,
      debug_counters=counters.get(),
      query_detection_debug_logs=query_detection_debug_logs)
  logging.info('NL Data API: Empty Exit')
  return data_dict
