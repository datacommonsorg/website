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
"""Vertex AI Embeddings store."""

from typing import List

from google.cloud import aiplatform
from google.cloud import aiplatform_v1

from nl_server.config import VertexAIIndexConfig
from nl_server.embeddings import EmbeddingsMatch
from nl_server.embeddings import EmbeddingsResult
from nl_server.embeddings import EmbeddingsStore


class VertexAIStore(EmbeddingsStore):
  """Manages the embeddings."""

  def __init__(self, index_info: VertexAIIndexConfig) -> None:
    super().__init__(healthcheck_query=index_info.healthcheck_query,
                     needs_tensor=False)

    self.index_endpoint = index_info.index_endpoint
    self.index_id = index_info.index_id

    aiplatform.init(project=index_info.project_id, location=index_info.location)
    self.vector_search_client = aiplatform_v1.MatchServiceClient(
        client_options={"api_endpoint": index_info.index_endpoint_root})

  #
  # Given a list of query embeddings, searches the vertex ai embeddings index
  # and returns a list of candidates in the same order as original queries.
  #
  def vector_search(self, query_embeddings: List[List[float]],
                    top_k: int) -> List[EmbeddingsResult]:
    results: List[EmbeddingsResult] = []
    for query_embedding in query_embeddings:
      vector_datapoint = aiplatform_v1.IndexDatapoint(
          feature_vector=query_embedding)
      vector_search_query = aiplatform_v1.FindNeighborsRequest.Query(
          datapoint=vector_datapoint, neighbor_count=top_k)
      vector_search_req = aiplatform_v1.FindNeighborsRequest(
          index_endpoint=self.index_endpoint,
          deployed_index_id=self.index_id,
          queries=[vector_search_query],
          return_full_datapoint=True,
      )
      vector_search_resp = self.vector_search_client.find_neighbors(
          vector_search_req)
      matches: List[EmbeddingsMatch] = []
      for n in vector_search_resp.nearest_neighbors[0].neighbors:
        dp = n.datapoint
        stat_var = dp.restricts[0].allow_list[0]
        matches.append(
            EmbeddingsMatch(sentence=dp.datapoint_id,
                            score=n.distance,
                            vars=[stat_var]))
      results.append(matches)
    return results
