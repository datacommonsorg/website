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

import csv
import json
import os

from absl import app
from absl import flags
from google.cloud import aiplatform
from google.cloud import aiplatform_v1
import ndcg
import yaml

PROJECT = 'datcom-website-dev'
LOCATION = 'us-central1'
VECTOR_SEARCH_ENDPOINT = "302175072.us-central1-496370955550.vdb.vertexai.goog"
INDEX_ENDPOINT = "projects/496370955550/locations/us-central1/indexEndpoints/8500794985312944128"
NEIGHBOR_COUNT = 30

FLAGS = flags.FLAGS

flags.DEFINE_string(
    'model_name', '',
    'Model name used for eval. Full list can be found in endpoints.yaml')

flags.DEFINE_string(
    'eval_folder', 'base',
    'The folder for a eval unit. It should contain a golden.json file')


def _load_model_endpoints():
  with open('vertex_ai_endpoints.yaml') as f:
    return yaml.full_load(f)


def _load_baseline():
  with open(os.path.join(FLAGS.eval_folder, 'golden.json')) as f:
    return json.load(f)


def vector_search(model_endpoints, query):
  model_info = model_endpoints.get(FLAGS.model_name)
  prediction_endpoint = aiplatform.Endpoint(
      model_info['prediction_endpoint_id'])
  vector_search_client = aiplatform_v1.MatchServiceClient(
      client_options={"api_endpoint": VECTOR_SEARCH_ENDPOINT},)
  query_vector = prediction_endpoint.predict(instances=[query]).predictions[0]
  vector_datapoint = aiplatform_v1.IndexDatapoint(feature_vector=query_vector)
  vector_search_query = aiplatform_v1.FindNeighborsRequest.Query(
      datapoint=vector_datapoint, neighbor_count=NEIGHBOR_COUNT)
  vector_search_req = aiplatform_v1.FindNeighborsRequest(
      index_endpoint=INDEX_ENDPOINT,
      deployed_index_id=model_info['index_id'],
      queries=[vector_search_query],
      return_full_datapoint=True,
  )
  vector_search_resp = vector_search_client.find_neighbors(vector_search_req)
  return vector_search_resp


def main(_):
  aiplatform.init(project=PROJECT, location=LOCATION)
  base_line = _load_baseline()
  model_endpoints = _load_model_endpoints()
  if FLAGS.model_name not in model_endpoints:
    print('Model not found from the config')
    return

  debug = {}
  report = []
  for query, base_line_matches in base_line.items():
    print(query)
    vector_search_resp = vector_search(model_endpoints, query)
    ranked_stat_vars = []
    debug[query] = {'vector_search': []}
    for n in vector_search_resp.nearest_neighbors[0].neighbors:
      dp = n.datapoint
      stat_var = dp.restricts[0].allow_list[0]
      if stat_var not in ranked_stat_vars:
        ranked_stat_vars.append(stat_var)
      debug[query]['vector_search'].append({
          'sentence': dp.datapoint_id,
          'stat_var': dp.restricts[0].allow_list[0],
          'distance': n.distance
      })
    if len(ranked_stat_vars) > len(base_line_matches):
      ranked_stat_vars = ranked_stat_vars[:len(base_line_matches)]
    debug[query]['ranked_stat_vars'] = ranked_stat_vars
    ranking_score = ndcg.ndcg(ranked_stat_vars, base_line_matches)
    report.append([query, ranking_score])

  folder = os.path.join(FLAGS.eval_folder, 'result')
  with open(os.path.join(folder, f'report_{FLAGS.model_name}.csv'), 'w') as f:
    writer = csv.writer(f)
    writer.writerows(report)
  with open(os.path.join(folder, f'debug_{FLAGS.model_name}.json'), 'w') as f:
    json.dump(debug, f)


if __name__ == "__main__":
  app.run(main)
