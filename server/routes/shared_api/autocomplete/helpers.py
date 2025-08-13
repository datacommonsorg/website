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
from server.routes.shared_api.place import findplacedcid

MAPS_API_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json?"
MIN_CHARACTERS_PER_QUERY = 3
MAX_NUM_OF_QUERIES = 4
DISPLAYED_RESPONSE_COUNT_LIMIT = 5
# Additional places to hack in autocomplete
TWO_WORD_CUSTOM_PLACES = [{
    'description': 'North America',
    'place_dcid': 'northamerica'
}, {
    'description': 'South America',
    'place_dcid': 'southamerica'
}]
CUSTOM_PLACES = [{
    'description': 'World',
    'place_dcid': 'Earth'
}, {
    'description': 'Earth',
    'place_dcid': 'Earth'
}, {
    'description': 'Europe',
    'place_dcid': 'europe'
}, {
    'description': 'Oceania',
    'place_dcid': 'oceania'
}, {
    'description': 'Africa',
    'place_dcid': 'africa'
}, {
    'description': 'Asia',
    'place_dcid': 'asia'
}] + TWO_WORD_CUSTOM_PLACES
SKIP_AUTOCOMPLETE_TRIGGER = [
    "tell", "me", "show", "about", "which", "what", "when", "how", "the"
]

# Exceptions for the 3 letter trigger rule. These queries can trigger on only two letters.
TWO_LETTER_TRIGGERS = {"us"}


def find_queries(user_query: str) -> List[str]:
  """Extracts subqueries to send to the Google Maps Predictions API from the entire user input.
  Returns:
      List[str]: containing all subqueries to execute.
  """
  rgx = re.compile(r'\s+')
  words_in_query = re.split(rgx, user_query)
  queries = []
  cumulative = ""

  last_word = words_in_query[-1].lower().strip()
  if last_word in SKIP_AUTOCOMPLETE_TRIGGER or (
      last_word == "" and len(words_in_query) > 1 and
      words_in_query[-2].lower().strip() in SKIP_AUTOCOMPLETE_TRIGGER):
    # don't return any queries.
    return []

  for word in reversed(words_in_query):
    # Extract at most 3 subqueries.
    if len(queries) >= MAX_NUM_OF_QUERIES:
      break

    # Prepend the current word for the next subquery.
    if len(cumulative) > 0:
      cumulative = word + " " + cumulative
    else:
      cumulative = word

    # Only send queries 3 characters or longer, except for the exceptions in TWO_LETTER_TRIGGERS.
    if (len(cumulative) >= MIN_CHARACTERS_PER_QUERY or
        (len(cumulative) == 2 and cumulative.lower() in TWO_LETTER_TRIGGERS)):
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
  return json.loads(response.text)


def get_score(p: ScoredPrediction) -> float:
  """Returns the score."""
  return p.score

def predict(queries: List[str], lang: str) -> List[ScoredPrediction]:
  """Trigger maps prediction api requests and process the output."""
  # A dictionary from a place_id to a list of sub-queries that returned it.
  place_id_to_queries: Dict[str, List[str]] = {}
  # A dictionary from a place_id to its description.
  place_id_to_description: Dict[str, str] = {}
  # A dictionary from a place_id to its best rank.
  place_id_to_rank: Dict[str, int] = {}

  for q in queries:
    predictions_for_query = execute_maps_request(q, lang)['predictions']

    for i, pred in enumerate(predictions_for_query):
      place_id = pred['place_id']
      if place_id not in place_id_to_queries:
        place_id_to_queries[place_id] = []
        place_id_to_description[place_id] = pred['description']
        place_id_to_rank[place_id] = i
      place_id_to_queries[place_id].append(q)
      place_id_to_rank[place_id] = min(place_id_to_rank[place_id], i)

  # For each place, find the longest sub-query that returned it.
  # This will be the matched_query.
  results: List[ScoredPrediction] = []
  for place_id, matched_queries in place_id_to_queries.items():
    matched_queries.sort(key=len, reverse=True)
    longest_query = matched_queries[0]
    # The score is based on the rank, lower is better.
    # Add a small factor for the length of the matched query.
    score = place_id_to_rank[place_id] - len(longest_query) * 0.01
    results.append(
        ScoredPrediction(description=place_id_to_description[place_id],
                         place_id=place_id,
                         place_dcid=None,
                         matched_query=longest_query,
                         score=score))

  return results


def fetch_place_id_to_dcid(
    prediction_responses: List[ScoredPrediction]) -> Dict[str, str]:
  """Fetches the associated DCID for each place ID returned by Google.
  Returns:
    Mapping of Place ID to DCID."""

  place_ids = []
  for prediction in prediction_responses:
    place_ids.append(prediction.place_id)

  place_id_to_dcid = dict()
  if place_ids:
    place_id_to_dcid = json.loads(findplacedcid(place_ids).data)

  for prediction in prediction_responses:
    if prediction.place_id in place_id_to_dcid:
      prediction.place_dcid = place_id_to_dcid[prediction.place_id]

  logging.info("[Place_Autocomplete] Found %d place ID to DCID mappings.",
               len(place_id_to_dcid))

  return prediction_responses
