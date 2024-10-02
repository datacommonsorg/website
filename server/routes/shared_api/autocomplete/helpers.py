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

import json
from typing import List
from urllib.parse import urlencode

from flask import current_app
import requests

MAPS_API_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json?"
MIN_CHARACTERS_PER_QUERY = 3
MAX_NUM_OF_QUERIES = 4
RESPONSE_COUNT_LIMIT = 5


def find_queries(user_query: str):
  """Extracts subqueries to send to the Google Maps Predictions API from the entire user input.

  Returns:
      List[str]: containing all subqueries to execute.
  """
  words_in_query = user_query.split(" ")
  queries = []
  cumulative = ""
  for word in reversed(words_in_query):
    # Extract at most 3 subqueries.
    if len(queries) >= MAX_NUM_OF_QUERIES:
      break

    # Prepend the current word for the next subquery.
    if len(cumulative) > 0:
      cumulative = word + " " + cumulative
    else:
      cumulative = word

    # Only send queries 3 characters or longer.
    if (len(cumulative) >= MIN_CHARACTERS_PER_QUERY):
      queries.append(cumulative)

  return queries


def execute_maps_request(query: str, language: str):
  """Execute a request to the Google Maps Prediction API for a given query.

  Returns:
      Json object containing the google maps prediction response.
  """
  request_obj = {
      'types': "(regions)",
      'key': current_app.config['MAPS_API_KEY'],
      'input': query,
      'language': language
  }
  response = requests.post(MAPS_API_URL + urlencode(request_obj), json={})
  return json.loads(response.text)


def predict(queries: List[str], lang: str):
  """Trigger maps prediction api requests and parse the output. Remove duplication responses and limit the number of results.

  Returns:
      Json object containing predictions from all queries issued after deduping.
  """
  responses = []
  place_ids = []
  for query in queries:
    predictions_for_query = execute_maps_request(query, lang)['predictions']
    for pred in predictions_for_query:
      if pred['place_id'] in place_ids:
        continue

      pred['matched_query'] = query
      responses.append(pred)
      place_ids.append(pred['place_id'])

      if len(responses) >= RESPONSE_COUNT_LIMIT:
        return responses

  return responses
