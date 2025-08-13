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
LANGUAGE_CLIENT = language_v1.LanguageServiceClient()
LIMIT = 5

SERVING_CONFIG_PATH = (
    f"projects/{VAI_PROJECT_ID}/locations/{VAI_LOCATION}/"
    f"collections/default_collection/engines/{VAI_SEARCH_ENGINE_ID}/"
    f"servingConfigs/{VAI_SEARCH_SERVING_CONFIG_ID}"
)

def analyze_query_concepts(query: str) -> List[str]:
  """Uses the NL API to extract a list of relevant concepts from a query."""
  # Words that are often extracted as entities but are too generic for a good search.
  STOP_WORDS = {}
  #     "people", "person", "place", "places", "city", "cities", "country",
  #     "countries", "county", "counties", "state", "states", "area", "areas",
  #     "region", "regions", "world", "earth", "me", "i"
  # }

  try:
    document = language_v1.Document(
        content=query, type_=language_v1.Document.Type.PLAIN_TEXT)
    response = LANGUAGE_CLIENT.analyze_entities(
        document=document, encoding_type=language_v1.EncodingType.UTF8)

    # Find all relevant entities, filtering out generic types and stop words.
    good_entities = []
    logger.info("NL API response for query '%s': %s", query, response)
    for entity in response.entities:
      if entity.name.lower() in STOP_WORDS:
        continue
      if entity.type_ in [
          language_v1.Entity.Type.LOCATION,
          language_v1.Entity.Type.ADDRESS,
          language_v1.Entity.Type.NUMBER, language_v1.Entity.Type.PRICE,
          language_v1.Entity.Type.DATE, language_v1.Entity.Type.PHONE_NUMBER
      ]:
        continue
      good_entities.append(entity)

    if not good_entities:
      return []

    # Sort entities by their position in the original query.
    good_entities.sort(key=lambda e: e.mentions[0].text.begin_offset)

    # Get the start of the first entity and the end of the last entity.
    start_offset = good_entities[0].mentions[0].text.begin_offset
    last_mention = good_entities[-1].mentions[0]
    end_offset = last_mention.text.begin_offset + len(last_mention.text.content)

    # Extract the full phrase from the original query.
    extracted_phrase = query[start_offset:end_offset]

    logging.info("NL API extracted phrase '%s' from query '%s'",
                 extracted_phrase, query)
    # Return a list containing the single, contiguous phrase.
    return [extracted_phrase.strip()]

  except Exception as e:
    logging.error("NL API request failed for query '%s': %s", query, e)
    return []


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
      relevance_threshold=discoveryengine.SearchRequest.RelevanceThreshold.MEDIUM)

  try:
    response = SEARCH_CLIENT.search(request)
  except Exception as e:
    logging.error("SearchRequest failed for query '%s': %s", search_query, e)
    return []

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