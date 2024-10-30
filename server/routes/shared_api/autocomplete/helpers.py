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
TWO_WORD_CONTINENTS = [{
    'description': 'North America',
    'place_id': 'ChIJnXKOaXELs1IRgqNhl4MoExM'
}, {
    'description': 'South America',
    'place_id': 'ChIJtTRdNRw0CZQRK-PGyc8M1Gk'
}]
CONTINENTS = [{
    'description': 'Europe',
    'place_id': 'ChIJhdqtz4aI7UYRefD8s-aZ73I'
}, {
    'description': 'Oceania',
    'place_id': 'ChIJQbA4_Cu8QW4RbuvrxISzaks'
}, {
    'description': 'Africa',
    'place_id': 'ChIJ1fWMlApsoBARs_CQnslwghA'
}, {
    'description': 'Asia',
    'place_id': 'ChIJV-jLJIrxYzYRWfSg0_xrQak'
}] + TWO_WORD_CONTINENTS
CONTINENT_PLACE_ID_TO_DCID = {
'ChIJhdqtz4aI7UYRefD8s-aZ73I': 'europe',
  'ChIJtTRdNRw0CZQRK-PGyc8M1Gk': 'southamerica',
  'ChIJnXKOaXELs1IRgqNhl4MoExM': 'northamerica',
  'ChIJV-jLJIrxYzYRWfSg0_xrQak': 'asia',
  'ChIJS3WQM3uWuaQRdSAPdB--Um4': 'antarctica',
  'ChIJQbA4_Cu8QW4RbuvrxISzaks': 'oceania',
  'ChIJ1fWMlApsoBARs_CQnslwghA': 'africa'
  }


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
  return json.loads(response.text)


def bag_of_letters(text: str) -> Dict:
  """Creates a bag-of-letters representation of a given string.
    Returns:
    dict: A dictionary where keys are letters and values are their counts.
    """
  bag = {}
  for char in text.lower():
    if char.isalpha():
      bag[char] = bag.get(char, 0) + 1
  return bag


# TODO(gmechali): Look into a better typo algo e.g Levenshtein distance.
def off_by_one_letter(str1_word: str, name_word: str) -> bool:
  """Function to do off by one check.
  Returns whether the two strings are off by at most one letter.
  """
  offby = 0
  str1_bag = bag_of_letters(str1_word)
  str2_bag = bag_of_letters(name_word)
  for key, value in str1_bag.items():
    if key in str2_bag:
      offby += abs(str2_bag[key] - value)
    else:
      offby += value

  # Add to offby for letters in str2 but not str1.
  for key, value in str2_bag.items():
    if key not in str1_bag:
      offby += value

  return offby <= 1


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
  for str1_idx, str1_word in enumerate(words_in_str1):
    str1_word = str1_word.lower()
    found_match = False
    for idx, name_word in enumerate(words_in_name):
      if idx < start_index:
        continue

      name_word = name_word.lower()
      if idx == 0 and str1_idx == 0 and name_word.startswith(str1_word):
        # boost score for start of query.
        score -= 0.5

      if str1_word == name_word:
        start_index = idx + 1
        score -= 1
        found_match = True
        break
      elif str1_word in name_word:
        start_index = idx + 1
        score -= 0.5
        found_match = True
        break
      elif off_by_one_letter(str1_word, name_word):
        start_index = idx + 1
        found_match = True
        score -= 0.25

    if not found_match:
      score += 1

  return score


def score_below_zero(pred: ScoredPrediction) -> bool:
  """Returns whether the score is below 0."""
  return pred.score < 0


def prepend_continent_hack(responses: List[ScoredPrediction],
                           queries: List[str]) -> List[ScoredPrediction]:
  """Prepend continents as responses in order to hack it in autocomplete.
  Returns:
    List of scored predictions."""

  continent_responses = []
  single_word_query = queries[-1]
  for continent in CONTINENTS:
    scored_prediction = ScoredPrediction(description=continent['description'],
                                         place_id=continent['place_id'],
                                         matched_query=single_word_query,
                                         score=get_match_score(
                                             single_word_query,
                                             continent['description']))
    continent_responses.append(scored_prediction)

  if len(queries) > 1:
    two_word_query = queries[-2]
    # If we have a 2 two word query, also place the two word continents as responses.
    for continent in TWO_WORD_CONTINENTS:
      scored_prediction = ScoredPrediction(description=continent['description'],
                                           place_id=continent['place_id'],
                                           matched_query=two_word_query,
                                           score=get_match_score(
                                               two_word_query,
                                               continent['description']))
      continent_responses.append(scored_prediction)

  # Only keep continents with a score below 0 as it implies it's close to the query.
  continent_responses = list(filter(score_below_zero, continent_responses))
  return continent_responses + responses


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

  # Continent hack - Continents not supported by Google Maps Predictions API.
  # This hack will always evaluate continents for each response. They will get filtered in/out based on the match_score we compute.
  all_responses = prepend_continent_hack(all_responses, queries)

  all_responses.sort(key=get_score)
  logging.info("[Place_Autocomplete] Received %d total place predictions.",
               len(all_responses))

  responses = []
  place_ids = set()
  index = 0
  while len(responses) < 2 * DISPLAYED_RESPONSE_COUNT_LIMIT and index < len(
      all_responses):
    if all_responses[index].place_id not in place_ids:
      responses.append(all_responses[index])
      place_ids.add(all_responses[index].place_id)
    index += 1

  return responses


def fetch_place_id_to_dcid(
    prediction_responses: List[ScoredPrediction]) -> Dict:
  """Fetches the associated DCID for each place ID returned by Google.
  Returns:
    Mapping of Place ID to DCID."""

  place_ids = []
  for prediction in prediction_responses:
    place_ids.append(prediction.place_id)

  place_id_to_dcid = dict()
  if place_ids:
    place_id_to_dcid = json.loads(findplacedcid(place_ids).data)

  # Add hardcoded continent Place IDs to DCIDs.
  place_id_to_dcid.update(CONTINENT_PLACE_ID_TO_DCID)

  logging.info("[Place_Autocomplete] Found %d place ID to DCID mappings.",
               len(place_id_to_dcid))

  return place_id_to_dcid

def get_score(p: ScoredPrediction) -> float:
  """Returns the score."""
  return p.score
