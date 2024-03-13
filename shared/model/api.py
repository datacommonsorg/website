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

# Module to hold API wrappers for model endpoints.

import logging

from google.cloud import aiplatform_v1

NEIGHBOR_COUNT = 20


def predict(model_info, queries):
  """Retrieve embedding vectors from model given queries.
  """
  return model_info['prediction_client'].predict(instances=queries).predictions


def vector_search(model_info, query):
  """Perform embedding vector search on model.
  """
  logging.info(f'query: {query}, index_id: {model_info["index_id"]}')
  query_vector = model_info['prediction_client'].predict(
      instances=[query]).predictions[0]
  vector_datapoint = aiplatform_v1.IndexDatapoint(feature_vector=query_vector)
  vector_search_query = aiplatform_v1.FindNeighborsRequest.Query(
      datapoint=vector_datapoint, neighbor_count=NEIGHBOR_COUNT)
  vector_search_req = aiplatform_v1.FindNeighborsRequest(
      index_endpoint=model_info['index_endpoint'],
      deployed_index_id=model_info['index_id'],
      queries=[vector_search_query],
      return_full_datapoint=True,
  )
  vector_search_resp = model_info['vector_search_client'].find_neighbors(
      vector_search_req)
  matches = []
  for n in vector_search_resp.nearest_neighbors[0].neighbors:
    dp = n.datapoint
    stat_var = dp.restricts[0].allow_list[0]
    matches.append({
        'sentence': dp.datapoint_id,
        'statVar': stat_var,
        'distance': n.distance
    })
  return {'embeddings': query_vector, 'matches': matches}
