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

import json
import logging
import os
import time
from typing import Dict

import flask
from flask import Blueprint
from flask import current_app
from flask import request
from google.protobuf.json_format import MessageToJson

import server.lib.explore.detector as insight_detector
import server.lib.explore.fulfiller as fulfillment
from server.lib.explore.params import DCNames
from server.lib.explore.params import Params
import server.lib.nl.common.constants as constants
import server.lib.nl.common.counters as ctr
import server.lib.nl.common.utils as utils
import server.lib.nl.common.utterance as nl_utterance
import server.lib.nl.config_builder.builder as config_builder
import server.lib.nl.detection.detector as nl_detector
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.utils import create_utterance
from server.lib.util import get_nl_disaster_config
from server.routes.nl import helpers

bp = Blueprint('explore_api', __name__, url_prefix='/api/explore')


#
# The detection endpoint.
#
@bp.route('/detect', methods=['POST'])
def detect():
  debug_logs = {}
  utterance, error_json = helpers.parse_query_and_detect(
      request, 'explore', debug_logs)
  if error_json:
    return error_json
  if not utterance:
    return helpers.abort('Failed to process!', '', [])

  data_dict = insight_detector.detect_with_context(utterance)

  dbg_counters = utterance.counters.get()
  utterance.counters = None
  status_str = "Successful"

  return helpers.prepare_response(data_dict,
                                  status_str,
                                  utterance.detection,
                                  dbg_counters,
                                  debug_logs,
                                  has_data=True)


#
# The fulfillment endpoint.
#
# POST request should contain:
#  - entities: An ordered list of places or other entity DCIDs.
#  - variables: A ordered list of SV or topic (dc/topic/..) DCIDs.
#  - childEntityType: A type of child entity (optional)
#
@bp.route('/fulfill', methods=['POST'])
def fulfill():
  """Data handler."""
  logging.info('NL Chart API: Enter')
  # NO production support yet.
  if os.environ.get('FLASK_ENV') == 'production':
    flask.abort(404)

  req_json = request.get_json()
  if not req_json:
    return helpers.abort('Missing input', '', [])
  if not req_json.get('entities'):
    return helpers.abort('`entities` must be provided', '', [])

  entities = req_json.get(Params.ENTITIES.value, [])
  cmp_entities = req_json.get(Params.CMP_ENTITIES.value, [])
  vars = req_json.get(Params.VARS.value, [])
  cmp_vars = req_json.get(Params.CMP_VARS.value, [])
  child_type = req_json.get(Params.CHILD_TYPE.value, '')
  session_id = req_json.get(Params.SESSION_ID.value, '')

  dc_name = req_json.get(Params.DC.value)
  if not dc_name:
    dc_name = DCNames.MAIN_DC.value
  if dc_name not in set([it.value for it in DCNames]):
    return helpers.abort(f'Invalid DC Name {dc_name}', '', [])

  counters = ctr.Counters()
  debug_logs = {}

  if not session_id:
    if current_app.config['LOG_QUERY']:
      session_id = utils.new_session_id('explore')
    else:
      session_id = constants.TEST_SESSION_ID

  # There is not detection, so just construct a structure.
  # TODO: Maybe check that if cmp_entities is set, entities should
  # be singleton.
  start = time.time()
  query_detection, error_msg = nl_detector.construct(entities, vars, child_type,
                                                     cmp_entities, cmp_vars,
                                                     debug_logs, counters)
  counters.timeit('query_detection', start)
  if not query_detection:
    return helpers.abort(error_msg, '', [])

  utterance = create_utterance(query_detection, None, counters, session_id)
  utterance.insight_ctx = req_json
  utterance.insight_ctx[Params.DC.value] = dc_name
  return _fulfill_with_chart_config(utterance, debug_logs)


#
# Given an utterance constructed either from a query or from dcids,
# fulfills it into charts.
#
def _fulfill_with_chart_config(utterance: nl_utterance.Utterance,
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
      nopc_vars=current_app.config['NOPC_VARS'])

  start = time.time()
  fresp = fulfillment.fulfill(utterance, cb_config)
  utterance.counters.timeit('fulfillment', start)
  if fresp.chart_pb:
    # Use the first chart's place as main place.
    main_place = utterance.places[0]
    page_config = json.loads(MessageToJson(fresp.chart_pb))

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
      'relatedThings': fresp.related_things,
      'userMessage': fresp.user_message,
  }
  status_str = "Successful"
  if utterance.rankedCharts:
    status_str = ""
  else:
    if not utterance.places:
      status_str += '**No Place Found**.'
    if not utterance.svs:
      status_str += '**No SVs Found**.'

  has_charts = True if page_config else False
  return helpers.prepare_response(data_dict,
                                  status_str,
                                  utterance.detection,
                                  dbg_counters,
                                  debug_logs,
                                  has_data=has_charts)
