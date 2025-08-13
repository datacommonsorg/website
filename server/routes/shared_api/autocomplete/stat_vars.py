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
VAI_ENGINE_ID = "stat-var-search-bq-data_1751939744678"
VAI_SERVING_CONFIG = (
    f"projects/{VAI_PROJECT_ID}/locations/{VAI_LOCATION}/collections/"
    f"default_collection/engines/{VAI_ENGINE_ID}/servingConfigs/default_config"
)
VAI_CLIENT = discoveryengine.SearchServiceClient()
LIMIT = 3
MAX_NUM_OF_QUERIES = 6
SKIP_AUTOCOMPLETE_TRIGGER = [
    "tell", "me", "show", "about", "which", "what", "when", "how", "the"
]


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
    # don't return any queries.
    return []

  for word in reversed(words_in_query):
    # Extract at most 6 subqueries.
    if len(queries) >= MAX_NUM_OF_QUERIES:
      break

    # Prepend the current word for the next subquery.
    if len(cumulative) > 0:
      cumulative = word + " " + cumulative
    else:
      cumulative = word

    queries.append(cumulative)

  # Start by running the longer queries.
  queries.reverse()
  return queries


def search_stat_vars(query: str) -> List[ScoredPrediction]:
  if not query:
    return []

  # Get all sub-queries from the user query.
  queries = find_stat_var_queries(query)
  if not queries:
    return []

  # For each sub-query, call Vertex AI Search.
  # Keep track of the results per sub-query.
  # A dictionary from a stat var dcid to a list of sub-queries that returned it.
  sv_to_queries: Dict[str, List[str]] = {}
  # A dictionary from a stat var dcid to its name.
  sv_to_name: Dict[str, str] = {}
  # A dictionary from a stat var dcid to its best rank.
  sv_to_rank: Dict[str, int] = {}

  for q in queries:
    search_request = discoveryengine.SearchRequest(
        serving_config=VAI_SERVING_CONFIG,
        query=q,
        page_size=LIMIT,
        spell_correction_spec=discoveryengine.SearchRequest.SpellCorrectionSpec(
            mode=discoveryengine.SearchRequest.SpellCorrectionSpec.Mode.AUTO),
        relevance_threshold=discoveryengine.SearchRequest.RelevanceThreshold.LOW)

    search_results = VAI_CLIENT.search(search_request)

    for i, response in enumerate(search_results.results):
      dcid = response.document.struct_data.get("dcid")
      name = response.document.struct_data.get("name")
      if not dcid or not name:
        logging.warning(
            "There's an issue with DCID or name for the stat var search result: %s",
            response.document.struct_data)
        continue

      if dcid not in sv_to_queries:
        sv_to_queries[dcid] = []
        sv_to_name[dcid] = name
        sv_to_rank[dcid] = i
      sv_to_queries[dcid].append(q)
      sv_to_rank[dcid] = min(sv_to_rank[dcid], i)

  # For each stat var, find the longest sub-query that returned it.
  # This will be the matched_query.
  results: List[ScoredPrediction] = []
  for dcid, matched_queries in sv_to_queries.items():
    matched_queries.sort(key=len, reverse=True)
    longest_query = matched_queries[0]
    # The score is based on the rank, lower is better.
    # Add a small factor for the length of the matched query.
    score = sv_to_rank[dcid] - len(longest_query) * 0.01
    results.append(
        ScoredPrediction(description=sv_to_name[dcid],
                         place_id=None,
                         place_dcid=dcid,
                         matched_query=longest_query,
                         score=score))

  results.sort(key=lambda x: x.score)
  return results