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
import re
from typing import Dict, List
from urllib.parse import urlencode

from flask import current_app
import requests

MAPS_API_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json?"
MIN_CHARACTERS_PER_QUERY = 3
MAX_NUM_OF_QUERIES = 4
RESPONSE_COUNT_LIMIT = 10
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

  if len(queries) <= 1:
    return queries

  # Priorize the 2 word query over 1 word query.
  words_in_first_query = re.split(rgx, queries[0])
  if len(words_in_first_query) == 1:
    tmp = queries[1]
    queries[1] = queries[0]
    queries[0] = tmp

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
  return json.loads(response.text)


def get_match_score(name: str, match_string: str) -> float:
  """Computes a 'score' based on the matching words in two strings.
  Returns:
    Float score."""
  rgx = re.compile(r'\s+')
  words_in_name = re.split(rgx, name)
  words_in_str1 = re.split(rgx, match_string)

  score = 0
  for str1_word in words_in_str1:
    str1_word = str1_word.lower()
    for name_word in words_in_name:
      name_word = name_word.lower()
      if str1_word == name_word:
        score += 1
        break
      elif str1_word in name_word:
        score += 0.5
        break
      else:
        score -= 1

  return score


def find_best_match(name: str, string1: str, string2: str) -> str:
  """Finds the best match between string1 and string2 for name. We use a very
  simple algorithm based on approximate accuracy.
  Returns:
    String that is the better match.
  """

  # Note that this function is implemented to find the best "matched_query", when the same response
  # is found multiple times.
  # For example:
  #   name: "California, USA"
  #   string1: "Of Calif"
  #   string2: "Calif"
  # should return "Calif" as a better match.
  score1 = get_match_score(name, string1)
  score2 = get_match_score(name, string2)

  if score2 > score1:
    return string2

  return string1


def predict(queries: List[str], lang: str) -> List[Dict]:
  """Trigger maps prediction api requests and parse the output. Remove duplication responses and limit the number of results.
  Returns:
      List of json objects containing predictions from all queries issued after deduping.
  """
  responses = []
  place_ids = set()
  duplicates = {}

  for query in queries:
    predictions_for_query = execute_maps_request(query, lang)['predictions']

    for pred in predictions_for_query:
      pred['matched_query'] = query
      if pred['place_id'] not in place_ids:
        place_ids.add(pred['place_id'])
        responses.append(pred)
      else:
        if pred['place_id'] in duplicates:
          # find best match
          # print("Second dupe.")
          bm = find_best_match(pred['description'],
                               duplicates[pred['place_id']], query)
          # print("BM won: ")
          # print(bm)
          duplicates[pred['place_id']] = bm
        else:
          # print("We're just getting our first dupe.")
          duplicates[pred['place_id']] = query

      if len(responses) >= RESPONSE_COUNT_LIMIT:
        # prevent new loop to iterate through next answer.
        break

    if len(responses) >= RESPONSE_COUNT_LIMIT:
      # prevent new loop that will make new request to maps api.
      break

  responses = responses[:DISPLAYED_RESPONSE_COUNT_LIMIT]
  for resp in responses:
    if resp['place_id'] in duplicates:
      best_match = find_best_match(resp['description'], resp['matched_query'],
                                   duplicates[resp['place_id']])
      resp["matched_query"] = best_match

  return responses
