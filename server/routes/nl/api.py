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

import flask
from flask import Blueprint
from flask import current_app
from flask import request

from server.routes.nl import helpers
import server.services.bigtable as bt

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
  utterance, error_json = helpers.parse_query_and_detect(
      request, 'nl', debug_logs)
  if error_json:
    return error_json
  if not utterance:
    return helpers.abort('Failed to process!', '', [])
  return helpers.fulfill_with_chart_config(utterance, debug_logs)


@bp.route('/history')
def history():
  # No production support.
  if os.environ.get('FLASK_ENV') == 'production':
    flask.abort(404)
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
  if (os.environ.get('FLASK_ENV') == 'production' or
      not current_app.config['LOG_QUERY']):
    flask.abort(404)

  session_id = request.json['sessionId']
  feedback_data = request.json['feedbackData']
  try:
    bt.write_feedback(session_id, feedback_data)
    return '', 200
  except Exception as e:
    logging.error(e)
    return 'Failed to record feedback data', 500
