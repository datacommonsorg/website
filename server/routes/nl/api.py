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

import flask
from flask import Blueprint
from flask import current_app
from flask import request

from server.lib.cache import model_cache
from server.lib.explore.params import Clients
from server.lib.explore.params import Params
from server.routes import TIMEOUT
from server.routes.nl import helpers
import server.services.bigtable as bt
import shared.model.api as model_api

bp = Blueprint('nl_api', __name__, url_prefix='/api/nl')


#
# The main Data Handler function
#
# TODO: rename this to a better endpoint
#
@bp.route('/data', methods=['POST'])
def data():
  """Data handler."""
  debug_logs = {}
  client = request.args.get(Params.CLIENT.value, Clients.DEFAULT.value)
  utterance, error_json = helpers.parse_query_and_detect(
      request, 'nl', client, debug_logs)
  if error_json:
    return error_json
  return helpers.fulfill_with_chart_config(utterance, debug_logs)


@bp.route('/history')
def history():
  return json.dumps(bt.read_success_rows())


#
# NOTE: `feedbackData` contains the logged payload.
#
# There are two types of feedback:
# (1) Query-level: when `queryId` key is set
# (2) Chart-level: when `chartId` field is set
#
# `chartId` is a json object that specifies the
# location of a chart in the session by means of:
#
#   queryIdx, categoryIdx, blockIdx, columnIdx, tileIdx
#
# The last 4 are indexes into the corresponding fields in
# the chart-config object (logged while processing the query),
# and of type SubjectPageConfig proto.
#
@bp.route('/feedback', methods=['POST'])
def feedback():
  if (not current_app.config['LOG_QUERY']):
    flask.abort(404)

  session_id = request.json['sessionId']
  feedback_data = request.json['feedbackData']
  try:
    bt.write_feedback(session_id, feedback_data)
    return '', 200
  except Exception as e:
    return 'Failed to record feedback data', 500


@bp.route('/encode-vector')
@model_cache.cached(timeout=TIMEOUT, query_string=True)
def encode_vector():
  """Retrieves the embedding vector for a given sentence and model.

    Valid model name can be found from `server/config/nl_page/nl_vertex_ai_models.yaml`
  """
  if not current_app.config['VERTEX_AI_MODELS']:
    flask.abort(404)
  sentence = request.args.get('sentence')
  model_name = request.args.get('modelName')
  return json.dumps(
      model_api.predict(current_app.config['VERTEX_AI_MODELS'][model_name],
                        [sentence]))


@bp.route('/vector-search')
@model_cache.cached(timeout=TIMEOUT, query_string=True)
def vector_search():
  """Performs vector search for a given sentence and model.

    Valid model name can be found from `server/config/nl_page/nl_vertex_ai_models.yaml`
  """
  if not current_app.config['VERTEX_AI_MODELS']:
    flask.abort(404)
  sentence = request.args.get('sentence')
  model_name = request.args.get('modelName')
  if not sentence:
    flask.abort(400, f'Bad sentence: {sentence}')
  if model_name not in current_app.config['VERTEX_AI_MODELS']:
    flask.abort(400, f'Bad model name: {model_name}')
  return model_api.vector_search(
      current_app.config['VERTEX_AI_MODELS'][model_name], sentence)
