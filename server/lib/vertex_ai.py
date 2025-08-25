# Copyright 2025 Google LLC
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
"""Helper functions for interacting with Vertex AI.
"""

import logging
import threading

from google.cloud import discoveryengine_v1 as discoveryengine

logger = logging.getLogger(__name__)

# Use a global variable to hold the client, initialized to None.
_vai_client = None
_vai_client_lock = threading.Lock()


def _get_search_client():
  """Initializes and returns a thread-safe singleton client."""
  global _vai_client
  # Lazy initialize the client
  if not _vai_client:
    with _vai_client_lock:
      # Check again in case another thread initialized it while we were waiting
      if not _vai_client:
        _vai_client = discoveryengine.SearchServiceClient()
  return _vai_client


def search(
    project_id: str, location: str, engine_id: str, serving_config_id: str,
    query: str, page_size: int, page_token: str | None, relevance_threshold: str
) -> discoveryengine.services.search_service.pagers.SearchPager:
  """Generic search function for a Vertex AI search application."""
  client = _get_search_client()
  serving_config = (f"projects/{project_id}/locations/{location}/"
                    f"collections/default_collection/engines/{engine_id}/"
                    f"servingConfigs/{serving_config_id}")

  search_request = discoveryengine.SearchRequest(
      serving_config=serving_config,
      query=query,
      page_token=page_token,
      page_size=page_size,
      spell_correction_spec=discoveryengine.SearchRequest.SpellCorrectionSpec(
          mode=discoveryengine.SearchRequest.SpellCorrectionSpec.Mode.AUTO),
      relevance_threshold=relevance_threshold)

  try:
    page_result = client.search(search_request)
    return page_result
  except Exception as e:
    logger.error("SearchRequest failed for query '%s': %s", query, e)
    return []
