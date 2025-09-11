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

import asyncio
import itertools
import logging
import time
from typing import List

from flask import Blueprint
from flask import jsonify
from flask import request

from server.lib.feature_flags import ENABLE_STAT_VAR_AUTOCOMPLETE
from server.lib.feature_flags import is_feature_enabled
from server.routes.shared_api.autocomplete import helpers
from server.routes.shared_api.autocomplete import stat_vars
from server.routes.shared_api.autocomplete.helpers import \
    SKIP_AUTOCOMPLETE_TRIGGER
from server.routes.shared_api.autocomplete.types import AutoCompleteApiResponse
from server.routes.shared_api.autocomplete.types import AutoCompleteResult
from server.routes.shared_api.autocomplete.types import ScoredPrediction

# Define blueprint
bp = Blueprint("autocomplete", __name__, url_prefix='/api')


@bp.route('/autocomplete')
async def autocomplete():
  """Predicts the user query for location and stat vars."""
  start_time = time.time()
  lang = request.args.get('hl')
  original_query = request.args.get('query', '')

  # Don't trigger autocomplete on short queries or if the last word is a stop word.
  words = original_query.split()
  if not words or len(original_query) < 3:
    return jsonify(AutoCompleteApiResponse(predictions=[]))
  last_word = words[-1].lower().strip()
  if last_word in SKIP_AUTOCOMPLETE_TRIGGER:
    return jsonify(AutoCompleteApiResponse(predictions=[]))

  # 1. FAN-OUT: Create all concurrent tasks.
  logging.info(f'[Autocomplete] Original Query: {original_query}')
  tasks = []
  task_metadata = []

  # Task A: Core Concept Stat Var Search
  concept_result = None
  if is_feature_enabled(ENABLE_STAT_VAR_AUTOCOMPLETE, request=request):
    # Note: analyze_query_concepts is synchronous and makes a blocking API call.
    # We run it once at the start.
    concept_result = stat_vars.analyze_query_concepts(original_query)
    logging.info(f'[Autocomplete] Concept Result: {concept_result}')
    if concept_result:
      tasks.append(
          asyncio.to_thread(stat_vars.search_stat_vars,
                            concept_result['cleaned_query']))
      task_metadata.append({
          'source': 'core_concept_sv',
          'original_phrase': concept_result['original_phrase']
      })

  # Task B: N-gram and Custom Place Search
  query_for_ngrams = original_query
  if concept_result and concept_result.get('place_name'):
    place_name = concept_result['place_name']
    place_name_end_pos = original_query.lower().find(place_name.lower()) + len(
        place_name)
    query_for_ngrams = original_query[place_name_end_pos:].strip()
    logging.info(
        f'[Autocomplete] Adjusted query for n-grams: "{query_for_ngrams}" (place: "{place_name}")'
    )

  ngram_queries = helpers.get_ngram_queries(query_for_ngrams)
  logging.info(f'[Autocomplete] N-gram queries: {ngram_queries}')

  for ngram_query in ngram_queries:
    # Custom place suggestions
    tasks.append(
        asyncio.to_thread(helpers.get_custom_place_suggestions, ngram_query))
    task_metadata.append({
        'source': 'custom_place',
        'matched_query': ngram_query
    })

    # Google Maps place predictions
    tasks.append(
        asyncio.to_thread(helpers.get_place_predictions, [ngram_query], lang,
                          'ngram_place'))
    task_metadata.append({
        'source': 'ngram_place',
        'matched_query': ngram_query
    })

    # Stat var n-gram search
    if is_feature_enabled(ENABLE_STAT_VAR_AUTOCOMPLETE, request=request):
      tasks.append(asyncio.to_thread(stat_vars.search_stat_vars, ngram_query))
      task_metadata.append({'source': 'ngram_sv', 'matched_query': ngram_query})

  # Run all tasks concurrently and gather results.
  all_results_nested = await asyncio.gather(*tasks, return_exceptions=True)
  all_predictions = []
  for i, result_list in enumerate(all_results_nested):
    if isinstance(result_list, Exception):
      logging.error(f"[Autocomplete] Task failed: {result_list}")
      continue
    meta = task_metadata[i]
    for p in result_list:
      p.source = meta['source']
      if meta['source'] == 'core_concept_sv':
        p.matched_query = meta['original_phrase']
      else:
        p.matched_query = meta['matched_query']
      p.has_place = concept_result['has_place'] if concept_result else False
      all_predictions.append(p)

  logging.info(
      f'[Autocomplete] Total predictions before ranking: {len(all_predictions)}'
  )

  # 2. RANK: Apply custom ranking to all gathered predictions.
  ranked_predictions = helpers.custom_rank_predictions(all_predictions,
                                                       original_query)
  logging.info(
      f'[Autocomplete] Total predictions after ranking: {ranked_predictions}')

  # 3. MERGE: Deduplicate and format the final list.
  places_to_fetch_dcid = [
      p for p in ranked_predictions if p.place_id and not p.place_dcid
  ]
  if places_to_fetch_dcid:
    helpers.fetch_place_id_to_dcid(places_to_fetch_dcid)

  final_predictions: List[AutoCompleteResult] = []
  seen_dcids = set()
  for prediction in ranked_predictions:
    if prediction.place_dcid and prediction.place_dcid not in seen_dcids:
      seen_dcids.add(prediction.place_dcid)
      is_place = prediction.place_id or prediction.source == 'custom_place'
      current_prediction = AutoCompleteResult(
          name=prediction.description,
          match_type='location_search' if is_place else 'stat_var_search',
          matched_query=prediction.matched_query,
          dcid=prediction.place_dcid,
          has_place=prediction.has_place)
      final_predictions.append(current_prediction)

  duration_ms = (time.time() - start_time) * 1000
  logging.info(
      f'[Autocomplete] Returning {len(final_predictions)} predictions in {duration_ms:.2f} ms'
  )

  return jsonify(AutoCompleteApiResponse(predictions=final_predictions))
