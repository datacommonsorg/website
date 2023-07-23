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

from enum import Enum
import logging
import os
import time

import flask
from flask import Blueprint
from flask import current_app
from flask import request

import server.lib.nl.common.constants as constants
import server.lib.nl.common.counters as ctr
import server.lib.nl.common.utils as utils
import server.lib.nl.common.utterance as nl_utterance
import server.lib.nl.detection.detector as detector
from server.lib.nl.detection.utils import create_utterance
from server.routes.nl import helpers

bp = Blueprint('insights_api', __name__, url_prefix='/api/insights')


class Params(str, Enum):
  ENTITIES = 'entities'
  VARS = 'variables'
  CHILD_TYPE = 'childEntityType'
  SESSION_ID = 'sessionId'
  CTX = 'context'


#
# The detection endpoint.
#
@bp.route('/detect', methods=['POST'])
def detect():
  debug_logs = {}
  utterance, error_json = helpers.parse_query_and_detect(request, debug_logs)
  if error_json:
    return error_json
  if not utterance:
    return helpers.abort('Failed to process!', '', [])

  dbg_counters = utterance.counters.get()
  utterance.counters = None
  context_history = nl_utterance.save_utterance(utterance)
  data_dict = {
      Params.ENTITIES.value: [
          p.dcid for p in utterance.detection.places_detected.places_found
      ],
      Params.VARS.value: utterance.svs,
      Params.CTX: context_history,
      Params.SESSION_ID: utterance.session_id,
  }
  place_type = utils.get_contained_in_type(utterance)
  if place_type:
    data_dict[Params.CHILD_TYPE.value] = place_type
  status_str = "Successful"
  return helpers.prepare_response(data_dict, status_str, utterance.detection,
                                  dbg_counters, debug_logs)


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
    helpers.abort('Missing input', '', [])
    return
  if (not req_json.get('entities') or not req_json.get('variables')):
    helpers.abort('Entities and variables must be provided', '', [])
    return

  entities = req_json.get(Params.ENTITIES.value)
  variables = req_json.get(Params.VARS.value)
  child_type = req_json.get(Params.CHILD_TYPE.value)
  session_id = req_json.get(Params.SESSION_ID.value)

  counters = ctr.Counters()
  debug_logs = {}

  if not session_id:
    if current_app.config['LOG_QUERY']:
      session_id = utils.new_session_id()
    else:
      session_id = constants.TEST_SESSION_ID

  # There is not detection, so just construct a structure.
  start = time.time()
  query_detection, error_msg = detector.construct(entities, variables,
                                                  child_type, debug_logs,
                                                  counters)
  counters.timeit('query_detection', start)
  if not query_detection:
    helpers.abort(error_msg, '', [])
    return

  utterance = create_utterance(query_detection, None, counters, session_id)
  return helpers.fulfill_with_chart_config(utterance, debug_logs)