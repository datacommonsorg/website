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
"""Endpoints for Datacommons NL"""

import asyncio
import json
import logging
import os
import time

import flask
from flask import Blueprint
from flask import current_app
from flask import request
from google.protobuf.json_format import MessageToJson
from markupsafe import escape

import server.lib.nl.common.constants as constants
import server.lib.nl.common.counters as ctr
import server.lib.nl.common.debug_utils as dbg
import server.lib.nl.common.utils as utils
import server.lib.nl.common.utterance as nl_utterance
import server.lib.nl.config_builder.builder as config_builder
import server.lib.nl.detection.heuristic_detector as heuristic_detector
import server.lib.nl.detection.llm_detector as llm_detector
import server.lib.nl.detection.llm_fallback as llm_fallback
from server.lib.nl.detection.types import Place
import server.lib.nl.fulfillment.context as context
import server.lib.nl.fulfillment.fulfiller as fulfillment
from server.lib.util import get_nl_disaster_config
import server.services.bigtable as bt
import shared.lib.utils as shared_utils

bp = Blueprint('nl_api', __name__, url_prefix='/api/nl')

_DEFAULT_DETECTOR = 'heuristic'


#
# The main Data Handler function
#
@bp.route('/data', methods=['POST'])
def data():
  """Data handler."""
  logging.info('NL Data API: Enter')
  if (os.environ.get('FLASK_ENV') == 'production' or
      not current_app.config['NL_MODEL']):
    flask.abort(404)

  disaster_config = current_app.config['NL_DISASTER_CONFIG']
  if current_app.config['LOCAL']:
    # Reload configs for faster local iteration.
    disaster_config = get_nl_disaster_config()
  else:
    logging.info('Unable to load event configs!')

  # Index-type default is in nl_server.
  embeddings_index_type = request.args.get('idx', '')
  original_query = request.args.get('q')
  context_history = []
  escaped_context_history = []
  if request.get_json():
    context_history = request.get_json().get('contextHistory', [])
    escaped_context_history = escape(context_history)

  detector_type = request.args.get('detector',
                                   default=_DEFAULT_DETECTOR,
                                   type=str)

  query = str(escape(shared_utils.remove_punctuations(original_query)))
  res = {
      'place': {
          'dcid': '',
          'name': '',
          'place_type': '',
      },
      'config': {},
      'context': escaped_context_history
  }

  counters = ctr.Counters()
  query_detection_debug_logs = {}
  query_detection_debug_logs["original_query"] = query

  if not query:
    logging.info("Query was empty")
    query_detection = heuristic_detector.detect("", "", embeddings_index_type,
                                                query_detection_debug_logs,
                                                counters)
    data_dict = dbg.result_with_debug_info(
        data_dict=res,
        status="Aborted: Query was Empty.",
        query_detection=query_detection,
        uttr_history=escaped_context_history,
        debug_counters=counters.get(),
        query_detection_debug_logs=query_detection_debug_logs,
        detector='Heuristic Based')
    logging.info('NL Data API: Empty Exit')
    return data_dict

  if detector_type in ['llm', 'hybrid'
                      ] and 'PALM_API_KEY' not in current_app.config:
    counters.err('failed_palm_keynotfound', '')
    detector_type = 'heuristic'

  # Query detection routine:
  # Returns detection for Place, SVs and Query Classifications.
  start = time.time()
  if detector_type == 'llm':
    actual_detector = 'LLM Based'
    query_detection = llm_detector.detect(original_query, context_history,
                                          embeddings_index_type,
                                          query_detection_debug_logs, counters)
  else:
    query_detection = heuristic_detector.detect(str(escape(original_query)),
                                                query, embeddings_index_type,
                                                query_detection_debug_logs,
                                                counters)
    if detector_type == 'hybrid':
      if llm_fallback.need_llm(query_detection, counters):
        actual_detector = 'Hybrid - LLM Fallback'
        counters.err('warning_llm_fallback', '')
        query_detection = llm_detector.detect(original_query, context_history,
                                              embeddings_index_type,
                                              query_detection_debug_logs,
                                              counters)
      else:
        actual_detector = 'Hybrid - Heuristic Based'
    else:
      actual_detector = 'Heuristic Based'
  counters.timeit('query_detection', start)

  # Generate new utterance.
  prev_utterance = nl_utterance.load_utterance(context_history)
  if prev_utterance:
    session_id = prev_utterance.session_id
  else:
    if current_app.config['LOG_QUERY']:
      session_id = utils.new_session_id()
    else:
      session_id = constants.TEST_SESSION_ID

  start = time.time()
  utterance = fulfillment.fulfill(query_detection, prev_utterance, counters,
                                  session_id)
  counters.timeit('fulfillment', start)

  if utterance.rankedCharts:
    start = time.time()
    page_config_pb = config_builder.build(utterance, disaster_config)
    page_config = json.loads(MessageToJson(page_config_pb))
    counters.timeit('build_page_config', start)

    # Use the first chart's place as main place.
    main_place = utterance.rankedCharts[0].places[0]
  else:
    page_config = {}
    main_place = Place(dcid='', name='', place_type='')
    logging.info('Found empty place for query "%s"',
                 query_detection.original_query)

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

  data_dict = dbg.result_with_debug_info(data_dict, status_str, query_detection,
                                         context_history, dbg_counters,
                                         query_detection_debug_logs,
                                         actual_detector)

  logging.info('NL Data API: Exit')
  return data_dict


@bp.route('/history')
def history():
  if (os.environ.get('FLASK_ENV') == 'production' or
      not current_app.config['NL_MODEL']):
    flask.abort(404)
  return json.dumps(bt.read_success_rows())
