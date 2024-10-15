# Copyright 2024 Google LLC
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

from flask import Blueprint
from flask import jsonify
from flask import request

from server.routes.shared_api.autocomplete import helpers
from server.routes.shared_api.autocomplete.types import AutoCompleteApiResponse
from server.routes.shared_api.autocomplete.types import AutoCompleteResult
from server.routes.shared_api.place import findplacedcid

# TODO(gmechali): Add Stat Var search.

# Define blueprint
bp = Blueprint("autocomplete", __name__, url_prefix='/api')


@bp.route('/autocomplete')
def autocomplete():
  """Predicts the user query for location only, using the Google Maps prediction API.
  Returns:
      Json object represnting 5 location predictions for the query.
  """
  lang = request.args.get('hl')
  query = request.args.get('query')

  # Extract subqueries from the user input.
  queries = helpers.find_queries(query)

  # Send requests to the Google Maps Predictions API.
  prediction_responses = helpers.predict(queries, lang)

  place_ids = []
  for prediction in prediction_responses:
    place_ids.append(prediction["place_id"])

  place_id_to_dcid = []
  if place_ids:
    place_id_to_dcid = json.loads(findplacedcid(place_ids).data)

  final_predictions = []
  for prediction in prediction_responses:
    if prediction['place_id'] in place_id_to_dcid:
      current_prediction = AutoCompleteResult(
          name=prediction['description'],
          match_type='location_search',
          matched_query=prediction['matched_query'],
          dcid=place_id_to_dcid[prediction['place_id']])
      final_predictions.append(current_prediction)

  return jsonify(AutoCompleteApiResponse(predictions=final_predictions))
