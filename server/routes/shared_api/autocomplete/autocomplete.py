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
bp = Blueprint("autocomplete", __name__, url_prefix='/api/autocomplete')


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
  predictions = helpers.issue_maps_predictions_requests(queries_to_send)

  # Filter out predictions if the matched substring is too short.
  predictions = list(filter(lambda p: p["matched_substrings"] and p["matched_substrings"][0]["length"] >= 3, predictions))
  print(predictions)


  place_ids = []
  for pred in predictions:
    place_ids.append(pred["place_id"])

  place_to_dcid = []
  if place_ids:  
    place_to_dcid = json.loads(findplacedcid(place_ids).data)

  my_preds = []
  for pred in predictions:
    new_pred = {}
    new_pred['name'] = pred['description']
    if pred['place_id'] in place_to_dcid:
        new_pred['dcid'] = place_to_dcid[pred['place_id']]
    new_pred['type'] = 'place'
    new_pred['matched_query'] = pred['matched_query']
    my_preds.append(new_pred)

  return {'place_results': {'places': my_preds, 'matching_place_query': query}}