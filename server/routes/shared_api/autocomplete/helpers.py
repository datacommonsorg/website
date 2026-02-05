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
import unicodedata
from urllib.parse import urlencode

from flask import current_app
import requests

from server.routes.shared_api.autocomplete.types import ScoredPrediction
from server.routes.shared_api.place import findplacedcid
from shared.lib.constants import STOP_WORDS

MAPS_API_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json?"
MIN_CHARACTERS_PER_QUERY = 3
MAX_NUM_OF_QUERIES = 4
DISPLAYED_RESPONSE_COUNT_LIMIT = 5
MAX_NGRAM_SIZE = 5

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


def bag_of_letters(text: str) -> Dict:
  """Creates a bag-of-letters representation of a given string."""
  bag = {}
  for char in text.lower():
    if char.isalpha():
      bag[char] = bag.get(char, 0) + 1
  return bag


def off_by_one_letter(str1_word: str, name_word: str) -> bool:
  """Function to do off by one check."""
  offby = 0
  str1_bag = bag_of_letters(str1_word)
  str2_bag = bag_of_letters(name_word)
  for key, value in str1_bag.items():
    if key in str2_bag:
      offby += abs(str2_bag[key] - value)
    else:
      offby += value

  for key, value in str2_bag.items():
    if key not in str1_bag:
      offby += value

  return offby <= 1


def sanitize_and_replace_non_ascii(string: str) -> str:
  """Sanitize and replace non ascii."""
  nfkd_form = unicodedata.normalize('NFKD', string)
  return "".join([c for c in nfkd_form if not unicodedata.combining(c)])


def get_match_score(match_string: str, name: str) -> float:
  """Computes a 'score' based on the matching words in two strings. The score is used for ranking, lower score is better."""
  name = sanitize_and_replace_non_ascii(name)
  match_string = sanitize_and_replace_non_ascii(match_string)

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
        score -= 0.25

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


def get_custom_place_suggestions(query: str) -> List[ScoredPrediction]:
  """Generates suggestions from the hardcoded list of custom places."""
  custom_places_responses = []
  # Check for custom places (e.g., Europe, North America)
  for place in CUSTOM_PLACES:
    score = get_match_score(query, place['description'])
    if score < 0:
      custom_places_responses.append(
          ScoredPrediction(description=place['description'],
                           place_id=None,
                           matched_query=query,
                           place_dcid=place['place_dcid'],
                           score=score,
                           source='custom_place'))
  return custom_places_responses


def execute_maps_request(query: str, language: str) -> Dict:
  """Execute a request to the Google Maps Prediction API for a given query."""
  request_obj = {
      'types': "(regions)",
      'key': current_app.config['MAPS_API_KEY'],
      'input': query,
      'language': language
  }
  response = requests.post(MAPS_API_URL + urlencode(request_obj), json={})
  return json.loads(response.text)


def get_place_predictions(queries: List[str], lang: str,
                          source: str) -> List[ScoredPrediction]:
  """Trigger maps prediction api requests and process the output."""
  place_id_to_best_query: Dict[str, str] = {}
  place_id_to_description: Dict[str, str] = {}
  place_id_to_rank: Dict[str, int] = {}

  for q in queries:
    predictions_for_query = execute_maps_request(q, lang).get('predictions', [])
    for i, pred in enumerate(predictions_for_query):
      place_id = pred['place_id']
      if place_id not in place_id_to_rank or i < place_id_to_rank[place_id]:
        place_id_to_rank[place_id] = i
        place_id_to_description[place_id] = pred['description']
        place_id_to_best_query[place_id] = q
      # If the rank is the same, prefer the shorter query.
      elif i == place_id_to_rank[place_id]:
        if len(q) < len(place_id_to_best_query[place_id]):
          place_id_to_best_query[place_id] = q

  results: List[ScoredPrediction] = []
  for place_id, best_query in place_id_to_best_query.items():
    score = place_id_to_rank[place_id] - len(best_query) * 0.01
    results.append(
        ScoredPrediction(description=place_id_to_description[place_id],
                         place_id=place_id,
                         place_dcid=None,
                         matched_query=best_query,
                         score=score,
                         source=source))

  return results


def fetch_place_id_to_dcid(
    prediction_responses: List[ScoredPrediction]) -> Dict[str, str]:
  """Fetches the associated DCID for each place ID returned by Google."""
  place_ids = []
  for prediction in prediction_responses:
    if prediction.place_id:
      place_ids.append(prediction.place_id)

  place_id_to_dcid = dict()
  if place_ids:
    place_id_to_dcid = json.loads(findplacedcid(place_ids).data)

  for prediction in prediction_responses:
    if prediction.place_id in place_id_to_dcid:
      prediction.place_dcid = place_id_to_dcid[prediction.place_id]

  return prediction_responses


def get_ngram_queries(query: str) -> List[str]:
  """Generates n-gram queries from the tail end of a query string."""
  tokens = query.split()
  if not tokens:
    return []
  # Generate n-grams of size 1 to MAX_NGRAM_SIZE
  ngrams = []
  for n in range(1, MAX_NGRAM_SIZE + 1):
    if n <= len(tokens):
      ngrams.append(" ".join(tokens[-n:]))
  return ngrams


def custom_rank_predictions(predictions: List[ScoredPrediction],
                            original_query: str) -> List[ScoredPrediction]:
  """Ranks a list of predictions based on a custom scoring algorithm."""
  for pred in predictions:
    # Lower score is better.
    new_score = pred.score

    # Add a large boost for place suggestions that are a direct prefix/full match.
    if pred.source in ['ngram_place', 'custom_place']:
      if pred.matched_query.lower() == (pred.description.lower()):
        new_score -= 30
      elif pred.description.lower().startswith(pred.matched_query.lower()):
        new_score -= 20

    # Apply other source-based boosts.
    if pred.source == 'core_concept_sv':
      new_score -= 20
    elif pred.source == 'ngram_sv':
      new_score -= 20

    # Boost based on how much of the original query was matched.
    if 'ngram' in pred.source:
      # Create a list of words from the query, excluding stop words
      meaningful_words = [
          word for word in pred.matched_query.lower().split()
          if word not in STOP_WORDS
      ]
      # Join them back to calculate a "clean" length
      clean_length = len(" ".join(meaningful_words))

      # Apply boost using the clean_length
      if pred.source == 'ngram_sv':
        new_score -= clean_length * 0.2
      elif pred.source == 'ngram_place':
        new_score -= clean_length * 0.4

      # Add a penalty for each stop word in the matched query.
      words_in_match = pred.matched_query.lower().split()
      stop_word_count = sum(1 for word in words_in_match if word in STOP_WORDS)
      # This penalty is meant to counteract the length boost of stop words,
      # making "total population" preferred over "against total population".
      new_score += stop_word_count * 3.0
    elif pred.source == 'custom_place':
      new_score -= len(pred.matched_query) * 0.6

    pred.score = new_score

  predictions.sort(key=lambda p: (p.score, not set(p.matched_query.lower(
  ).split()).isdisjoint(STOP_WORDS)))
  return predictions
