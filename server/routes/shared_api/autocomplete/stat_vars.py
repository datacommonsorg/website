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
from typing import List

from google.cloud import discoveryengine_v1 as discoveryengine

logger = logging.getLogger(__name__)
from google.cloud import language_v1

from server.routes.shared_api.autocomplete.types import ScoredPrediction

# Constants for Vertex AI Search Application
VAI_PROJECT_ID = "datcom-nl"
VAI_LOCATION = "global"
VAI_SEARCH_ENGINE_ID = "nl-statvar-search-prod_1753469590396"
VAI_SEARCH_SERVING_CONFIG_ID = "default_search"

SEARCH_CLIENT = discoveryengine.SearchServiceClient()
COMPLETE_CLIENT = discoveryengine.CompletionServiceClient()
LANGUAGE_CLIENT = language_v1.LanguageServiceClient()
LIMIT = 5

# Note: The data store ID for completions may be different from the search engine ID.
# Using the ID from the user's initial curl command.
VAI_DATA_STORE_ID = "nl-statvar-search-prod_1753469569408"

SERVING_CONFIG_PATH = (
    f"projects/{VAI_PROJECT_ID}/locations/{VAI_LOCATION}/"
    f"collections/default_collection/engines/{VAI_SEARCH_ENGINE_ID}/"
    f"servingConfigs/{VAI_SEARCH_SERVING_CONFIG_ID}"
)

DATA_STORE_PATH = (
    f"projects/{VAI_PROJECT_ID}/locations/{VAI_LOCATION}/"
    f"collections/default_collection/dataStores/{VAI_DATA_STORE_ID}"
)

def analyze_query_concepts(query: str) -> List[str]:
  """
  Uses the NL API to extract key concepts from a query using Part-of-Speech
  tagging. This is used to remove conversational filler.
  """
  # Tags to keep: Adjectives, Nouns, Numbers, and foreign/unknown words.
  # This preserves important descriptors while removing filler like "how many",
  # "what is", etc.
  KEEP_TAGS = {
      language_v1.PartOfSpeech.Tag.ADJ,
      language_v1.PartOfSpeech.Tag.NOUN,
      language_v1.PartOfSpeech.Tag.NUM,
      language_v1.PartOfSpeech.Tag.X,
  }

  try:
    document = language_v1.Document(
        content=query, type_=language_v1.Document.Type.PLAIN_TEXT)
    response = LANGUAGE_CLIENT.analyze_syntax(
        document=document, encoding_type=language_v1.EncodingType.UTF8)

    kept_words = []
    for token in response.tokens:
      if token.part_of_speech.tag in KEEP_TAGS:
        kept_words.append(token.text.content)

    if not kept_words:
      return []

    # Join the kept words to form the cleaned query concept.
    extracted_phrase = " ".join(kept_words)
    logging.info("NL API extracted phrase '%s' from query '%s'",
                 extracted_phrase, query)
    return [extracted_phrase]

  except Exception as e:
    logging.error("NL API request failed for query '%s': %s", query, e)
    # Fallback to returning the original query if the API fails.
    return [query.strip()] if query else []


def search_stat_vars(query: str, concepts: List[str]) -> List[ScoredPrediction]:
  if not query or not concepts:
    return []

  # Join the concepts to form a search query. In this new logic, there will only be one concept.
  search_query = " ".join(concepts)
  # The matched query for replacement should also be this phrase.
  matched_query = search_query

  request = discoveryengine.SearchRequest(
      serving_config=SERVING_CONFIG_PATH,
      query=search_query,
      page_size=LIMIT,
      relevance_threshold=discoveryengine.SearchRequest.RelevanceThreshold.LOW)
  complete_request = discoveryengine.CompleteQueryRequest(
      data_store=DATA_STORE_PATH,
      query=query,
      include_tail_suggestions=True)

  logger.info(f"Complete query request: {complete_request}")
  try:
    complete_response = COMPLETE_CLIENT.complete_query(complete_request)
    response = SEARCH_CLIENT.search(request)
  except Exception as e:
    logging.error("Complete failed for query '%s': %s", complete_request, e)
    logging.error("SearchRequest failed for query '%s': %s", search_query, e)
    return []

  print(f"Complete response: {complete_response}")
  print(f"end complete response")
  results: List[ScoredPrediction] = []
  for i, result in enumerate(response.results):
    dcid = result.document.struct_data.get("dcid")
    name = result.document.struct_data.get("name")
    if not dcid or not name:
      continue

    score = i  # Simple rank-based score
    results.append(
        ScoredPrediction(description=name,
                         place_id=None,
                         place_dcid=dcid,
                         matched_query=matched_query,
                         score=score))

  return results