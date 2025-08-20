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
import threading
from typing import Dict, List, Optional

from google.cloud import discoveryengine_v1 as discoveryengine
from google.cloud import language_v1

from server.lib import vertex_ai
from server.routes.shared_api.autocomplete.types import ScoredPrediction

logger = logging.getLogger(__name__)

# Constants for Vertex AI Search Application
VAI_PROJECT_ID = "datcom-nl"
VAI_LOCATION = "global"
VAI_SEARCH_ENGINE_ID = "nl-statvar-search-prod_1753469590396"
VAI_SEARCH_SERVING_CONFIG_ID = "default_search"
LIMIT = 30

# Use a global variable to hold the client, initialized to None.
# This will be initialized once, on first use.
_language_client = None
_language_client_lock = threading.Lock()


def analyze_query_concepts(query: str) -> Optional[Dict[str, str]]:
  """
  Uses the NL API to extract key concepts from a query using Part-of-Speech
  tagging.
  Returns a dictionary with the cleaned query and the original phrase, or None.
  """
  global _language_client

  # Lazy initialize the client
  if not _language_client:
    with _language_client_lock:
      # Check again in case another thread initialized it while we were waiting
      if not _language_client:
        _language_client = language_v1.LanguageServiceClient()

  KEEP_TAGS = {
      language_v1.PartOfSpeech.Tag.ADJ,
      language_v1.PartOfSpeech.Tag.NOUN,
      language_v1.PartOfSpeech.Tag.NUM,
      language_v1.PartOfSpeech.Tag.X,
  }

  try:
    document = language_v1.Document(content=query,
                                    type_=language_v1.Document.Type.PLAIN_TEXT)
    response = _language_client.analyze_syntax(
        document=document, encoding_type=language_v1.EncodingType.UTF8)

    kept_tokens = []
    for token in response.tokens:
      pos = token.part_of_speech
      if pos.tag == language_v1.PartOfSpeech.Tag.NOUN and pos.proper == language_v1.PartOfSpeech.Proper.PROPER:
        continue
      if pos.tag in KEEP_TAGS:
        kept_tokens.append(token)

    if not kept_tokens:
      return None

    cleaned_query = " ".join([t.text.content for t in kept_tokens])

    first_offset = kept_tokens[0].text.begin_offset
    last_token = kept_tokens[-1]
    last_offset = last_token.text.begin_offset + len(last_token.text.content)
    original_phrase = query[first_offset:last_offset]

    logging.info("NL API extracted phrase '%s' (cleaned: '%s') from query '%s'",
                 original_phrase, cleaned_query, query)

    return {
        "cleaned_query": cleaned_query,
        "original_phrase": original_phrase,
    }

  except Exception as e:
    logging.error("NL API request failed for query '%s': %s", query, e)
    return None


def search_stat_vars(search_query: str) -> List[ScoredPrediction]:
  if not search_query:
    return []

  response = vertex_ai.search(
      project_id=VAI_PROJECT_ID,
      location=VAI_LOCATION,
      engine_id=VAI_SEARCH_ENGINE_ID,
      serving_config_id=VAI_SEARCH_SERVING_CONFIG_ID,
      query=search_query,
      page_size=LIMIT,
      page_token=None,
      relevance_threshold=discoveryengine.SearchRequest.RelevanceThreshold.LOW)

  results: List[ScoredPrediction] = []
  for i, result in enumerate(response.results):
    dcid = result.document.struct_data.get("dcid")
    name = result.document.struct_data.get("name")
    if not dcid or not name:
      continue

    score = i
    results.append(
        ScoredPrediction(description=name,
                         place_id=None,
                         place_dcid=dcid,
                         matched_query=None,
                         score=score,
                         source=None))

  return results