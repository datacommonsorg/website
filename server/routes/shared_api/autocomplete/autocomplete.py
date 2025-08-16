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

import itertools
import logging
from typing import List

from flask import Blueprint, jsonify, request

from server.lib.feature_flags import (
    ENABLE_STAT_VAR_AUTOCOMPLETE, is_feature_enabled)
from server.routes.shared_api.autocomplete import helpers, stat_vars
from server.routes.shared_api.autocomplete.types import (
    AutoCompleteApiResponse, AutoCompleteResult, ScoredPrediction)

# Define blueprint
bp = Blueprint("autocomplete", __name__, url_prefix='/api')

# The maximum number of words to use for n-gram tail-end queries.
MAX_NGRAM_SIZE = 3


def _get_ngram_queries(query: str) -> List[str]:
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


def _custom_rank_predictions(predictions: List[ScoredPrediction],
                             original_query: str) -> List[ScoredPrediction]:
  """Ranks a list of predictions based on a custom scoring algorithm."""
  for pred in predictions:
    # Lower score is better.
    # The base score is the rank from the underlying API.
    new_score = pred.score

    # Boost scores based on the source of the suggestion.
    if pred.source == 'core_concept_sv':
      new_score -= 50  # Major boost for core concepts
    elif pred.source == 'ngram_place':
      new_score -= 10  # Minor boost for places found via n-grams

    # Boost based on how much of the original query was matched.
    if pred.matched_query:
      # Add a small factor for the length of the matched query.
      new_score -= len(pred.matched_query) * 0.1

    pred.score = new_score

  predictions.sort(key=lambda p: p.score)
  return predictions


@bp.route('/autocomplete')
def autocomplete():
  """Predicts the user query for location and stat vars."""
  lang = request.args.get('hl')
  original_query = request.args.get('query')
  all_predictions: List[ScoredPrediction] = []

  # 1. FAN-OUT: Generate and execute queries in parallel.
  logging.info(f'[Autocomplete] Original Query: {original_query}')

  # Task A: Core Concept Stat Var Search
  if is_feature_enabled(ENABLE_STAT_VAR_AUTOCOMPLETE):
    concept_result = stat_vars.analyze_query_concepts(original_query)
    logging.info(f'[Autocomplete] Concept Result: {concept_result}')
    if concept_result:
      sv_predictions = stat_vars.search_stat_vars(
          concept_result['cleaned_query'])
      logging.info(
          f'[Autocomplete] Found {len(sv_predictions)} SV predictions for core concept.'
      )
      for p in sv_predictions:
        p.source = 'core_concept_sv'
        p.matched_query = concept_result['original_phrase']
      all_predictions.extend(sv_predictions)

  # Task B: N-gram Tail-end Search (for both Places and Stat Vars)
  ngram_queries = _get_ngram_queries(original_query)
  logging.info(f'[Autocomplete] N-gram queries: {ngram_queries}')
  for ngram_query in ngram_queries:
    # Search for places using the n-gram
    place_predictions = helpers.predict([ngram_query], lang, source='ngram_place')
    logging.info(
        f'[Autocomplete] Found {len(place_predictions)} place predictions for n-gram: "{ngram_query}"'
    )
    all_predictions.extend(place_predictions)

    # Search for stat vars using the n-gram
    if is_feature_enabled(ENABLE_STAT_VAR_AUTOCOMPLETE):
      sv_ngram_predictions = stat_vars.search_stat_vars(ngram_query)
      logging.info(
          f'[Autocomplete] Found {len(sv_ngram_predictions)} SV predictions for n-gram: "{ngram_query}"'
      )
      for p in sv_ngram_predictions:
        p.source = 'ngram_sv'
        p.matched_query = ngram_query
      all_predictions.extend(sv_ngram_predictions)

  logging.info(
      f'[Autocomplete] Total predictions before ranking: {len(all_predictions)}')

  # 2. RANK: Apply custom ranking to all gathered predictions.
  ranked_predictions = _custom_rank_predictions(all_predictions, original_query)
  logging.info(
      f'[Autocomplete] Total predictions after ranking: {len(ranked_predictions)}')

  # 3. MERGE: Deduplicate and format the final list.
  final_predictions: List[AutoCompleteResult] = []
  seen_dcids = set()
  for prediction in ranked_predictions:
    # Fetch DCID for place predictions if not already present.
    if prediction.place_id and not prediction.place_dcid:
      helpers.fetch_place_id_to_dcid([prediction])

    if prediction.place_dcid and prediction.place_dcid not in seen_dcids:
      seen_dcids.add(prediction.place_dcid)
      current_prediction = AutoCompleteResult(
          name=prediction.description,
          match_type='location_search'
          if prediction.place_id else 'stat_var_search',
          matched_query=prediction.matched_query,
          dcid=prediction.place_dcid)
      final_predictions.append(current_prediction)

      if len(final_predictions) == helpers.DISPLAYED_RESPONSE_COUNT_LIMIT:
        break

  logging.info("[Autocomplete] Returning a total of %d predictions.",
               len(final_predictions))

  return jsonify(AutoCompleteApiResponse(predictions=final_predictions))
