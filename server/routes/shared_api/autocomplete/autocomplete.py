# Copyright 2020 Google LLC
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

import json

import requests
from typing import Dict
import flask
from flask import Blueprint
from flask import current_app
from flask import request

from server.routes.shared_api.autocomplete import helpers
from urllib.parse import urlencode
from server.routes.shared_api.place import findplacedcid


# TODO(gmechali): add unittest for this module

# Define blueprint
bp = Blueprint("autocomplete", __name__, url_prefix='/api')


@bp.route('/autocomplete', methods=['GET', 'POST'])
def autocomplete():
  """TODO.

  Returns:
      TODO.
  """
  debug_logs = {}

  original_query = request.args.get('query')
  query = original_query

  # Extract subqueries from the user input.
  queries_to_send = helpers.find_queries(query)

  # send requests.
  prediction_responses = helpers.issue_maps_predictions_requests(queries_to_send)

  place_ids = []
  for prediction in prediction_responses:
    place_ids.append(prediction["place_id"])

  place_id_to_dcid = []
  if place_ids:  
    place_id_to_dcid = json.loads(findplacedcid(place_ids).data)

  final_predictions = []
  for prediction in prediction_responses:
    current_prediction = {}
    current_prediction['name'] = prediction['description']
    current_prediction['type'] = 'PLACE'
    current_prediction['matched_query'] = prediction['matched_query']
    if prediction['place_id'] in place_id_to_dcid:
        current_prediction['dcid'] = place_id_to_dcid[prediction['place_id']]

    final_predictions.append(current_prediction)

  return {'predictions': final_predictions}