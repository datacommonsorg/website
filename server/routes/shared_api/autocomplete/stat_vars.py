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

import logging
import re
from typing import Dict, List

from google.cloud import discoveryengine_v1 as discoveryengine

from server.routes.shared_api.autocomplete.types import ScoredPrediction

# Constants for Vertex AI Search Application
VAI_PROJECT_ID = "datcom-website-dev"
VAI_LOCATION = "global"

# Constants for SearchRequest
VAI_SEARCH_ENGINE_ID = "alyssaguo-statvar-recognit_1749050492364"
VAI_SEARCH_SERVING_CONFIG_ID = "default_search"

# Constants for CompleteQueryRequest
VAI_COMPLETION_DATA_STORE_ID = "alyssaguo-statvars_1749050472293"

SEARCH_CLIENT = discoveryengine.SearchServiceClient()
COMPLETION_CLIENT = discoveryengine.CompletionServiceClient()

LIMIT = 3
MAX_NUM_OF_QUERIES = 6
SKIP_AUTOCOMPLETE_TRIGGER = [
    "tell", "me", "show", "about", "which", "what", "when", "how", "the"
]

SERVING_CONFIG_PATH = (
    f"projects/{VAI_PROJECT_ID}/locations/{VAI_LOCATION}/"
    f"collections/default_collection/engines/{VAI_SEARCH_ENGINE_ID}/"
    f"servingConfigs/{VAI_SEARCH_SERVING_CONFIG_ID}"
)

DATA_STORE_PATH = (
    f"projects/{VAI_PROJECT_ID}/locations/{VAI_LOCATION}/"
    f"collections/default_collection/dataStores/{VAI_COMPLETION_DATA_STORE_ID}"
)


def find_stat_var_queries(user_query: str) -> List[str]:
  rgx = re.compile(r'\s+')
  words_in_query = re.split(rgx, user_query)
  queries = []
  cumulative = ""

  last_word = words_in_query[-1].lower().strip()
  if last_word in SKIP_AUTOCOMPLETE_TRIGGER or (
      last_word == "" and
      len(words_in_query) > 1 and
      words_in_query[-2].lower().strip() in SKIP_AUTOCOMPLETE_TRIGGER):
    return []

  for word in reversed(words_in_query):
    if len(queries) >= MAX_NUM_OF_QUERIES:
      break

    if len(cumulative) > 0:
      cumulative = word + " " + cumulative
    else:
      cumulative = word

    queries.append(cumulative)

  queries.reverse()
  return queries


# This is the main function used by the application.
def search_stat_vars(query: str) -> List[ScoredPrediction]:
  if not query:
    return []

  queries = find_stat_var_queries(query)
  if not queries:
    return []

  sv_to_queries: Dict[str, List[str]] = {}
  sv_to_name: Dict[str, str] = {}
  sv_to_rank: Dict[str, int] = {}

  for q in queries:
    request = discoveryengine.SearchRequest(
        serving_config=SERVING_CONFIG_PATH,
        query=q,
        page_size=LIMIT,
        relevance_threshold=discoveryengine.SearchRequest.RelevanceThreshold.LOW)

    try:
      response = SEARCH_CLIENT.search(request)
    except Exception as e:
      logging.error("SearchRequest failed for query '%s': %s", q, e)
      return []

    for i, result in enumerate(response.results):
      dcid = result.document.struct_data.get("dcid")
      name = result.document.struct_data.get("name")
      if not dcid or not name:
        continue

      if dcid not in sv_to_queries:
        sv_to_queries[dcid] = []
        sv_to_name[dcid] = name
        sv_to_rank[dcid] = i
      sv_to_queries[dcid].append(q)
      sv_to_rank[dcid] = min(sv_to_rank[dcid], i)

  results: List[ScoredPrediction] = []
  for dcid, matched_queries in sv_to_queries.items():
    matched_queries.sort(key=len, reverse=True)
    longest_query = matched_queries[0]
    score = sv_to_rank[dcid] - len(longest_query) * 0.01
    results.append(
        ScoredPrediction(description=sv_to_name[dcid],
                         place_id=None,
                         place_dcid=dcid,
                         matched_query=longest_query,
                         score=score))

  results.sort(key=lambda x: x.score)
  return results


# This is a separate function for testing the CompleteQuery API.
# It is not currently used by the application.
def _test_complete_query(query: str):
  if not query:
    return

  logging.info("Testing CompleteQuery API with query: '%s'", query)
  request = discoveryengine.CompleteQueryRequest(data_store=DATA_STORE_PATH,
                                                 query=query,
                                                 user_pseudo_id='user-gemini-123',
                                                 include_tail_suggestions=True)
  try:
    response = COMPLETION_CLIENT.complete_query(request)
    logging.info("CompleteQuery response: %s", response)
    return response
  except Exception as e:
    logging.error("CompleteQueryRequest failed: %s", e)
    return None
