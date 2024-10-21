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
import logging
import re
from typing import Dict, List
from urllib.parse import urlencode

from flask import current_app
import requests

from server.routes.shared_api.autocomplete.types import ScoredPrediction

MAPS_API_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json?"
MIN_CHARACTERS_PER_QUERY = 3
MAX_NUM_OF_QUERIES = 4
DISPLAYED_RESPONSE_COUNT_LIMIT = 5


def find_queries(user_query: str) -> List[str]:
  """Extracts subqueries to send to the Google Maps Predictions API from the entire user input.
  Returns:
      List[str]: containing all subqueries to execute.
  """
  rgx = re.compile(r'\s+')
  words_in_query = re.split(rgx, user_query)
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

  # Start by running the longer queries.
  queries.reverse()
  return queries


def execute_maps_request(query: str, language: str) -> Dict:
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
  logging.info("Executed Google Maps Prediction API request.")
  return json.loads(response.text)


def get_match_score(match_string: str, name: str) -> float:
  """Computes a 'score' based on the matching words in two strings. Lowest
  score is best match.
  Returns:
    Float score."""
  rgx = re.compile(r'[\s|,]+')
  words_in_name = re.split(rgx, name)
  words_in_str1 = re.split(rgx, match_string)

  score = 0
  start_index = 0
  for str1_word in words_in_str1:
    str1_word = str1_word.lower()
    for idx, name_word in enumerate(words_in_name):
      if idx < start_index:
        continue

      name_word = name_word.lower()
      if str1_word == name_word:
        start_index = idx + 1
        score -= 1
        break
      elif str1_word in name_word:
        start_index = idx + 1
        score -= 0.5
        break
      else:
        score += 1

  return score


def predict(queries: List[str], lang: str) -> List[ScoredPrediction]:
  """Trigger maps prediction api requests and parse the output. Remove duplication responses and limit the number of results.
  Returns:
      List of json objects containing predictions from all queries issued after deduping.
  """
  all_responses = []
  for query in queries:
    predictions_for_query = execute_maps_request(query, lang)['predictions']

    for pred in predictions_for_query:
      scored_prediction = ScoredPrediction(description=pred['description'],
                                           place_id=pred['place_id'],
                                           matched_query=query,
                                           score=get_match_score(
                                               query, pred['description']))
      all_responses.append(scored_prediction)

  all_responses.sort(key=get_score)
  logging.info("Received %d total place predictions.", len(all_responses))

  responses = []
  place_ids = set()
  index = 0
  while len(responses) < DISPLAYED_RESPONSE_COUNT_LIMIT and index < len(
      all_responses):
    if all_responses[index].place_id not in place_ids:
      responses.append(all_responses[index])
      place_ids.add(all_responses[index].place_id)
    index += 1

  return responses


def get_score(p: ScoredPrediction) -> float:
  """Returns the score."""
  return p.score
