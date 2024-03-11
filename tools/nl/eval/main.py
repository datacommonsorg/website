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

import shared.lib.ndcg as ndcg
import shared.model.api as model_api
import shared.model.loader as model_loader

FLAGS = flags.FLAGS

flags.DEFINE_string(
    'model_name', '',
    'Model name used for eval. Full list can be found in endpoints.yaml')

flags.DEFINE_string(
    'eval_folder', 'base',
    'The folder for a eval unit. It should contain a golden.json file')

curr_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)))


def _load_baseline():
  with open(os.path.join(curr_dir, FLAGS.eval_folder, 'golden.json')) as f:
    return json.load(f)


def main(_):
  base_line = _load_baseline()
  models = model_loader.load()
  if FLAGS.model_name not in models:
    print('Model not found from the config')
    return
  model_info = models[FLAGS.model_name]

  debug = {}
  report = []
  for query, base_line_matches in base_line.items():
    print(query)
    vector_search_resp = model_api.vector_search(model_info, query)
    debug[query] = {'vector_search': vector_search_resp}
    ranked_stat_vars = []
    for item in vector_search_resp:
      if item['stat_var'] not in ranked_stat_vars:
        ranked_stat_vars.append(item['stat_var'])
    if len(ranked_stat_vars) > len(base_line_matches):
      ranked_stat_vars = ranked_stat_vars[:len(base_line_matches)]
    debug[query]['ranked_stat_vars'] = ranked_stat_vars
    ranking_score = ndcg.ndcg(ranked_stat_vars, base_line_matches)
    report.append([query, ranking_score])

  result_folder = os.path.join(curr_dir, FLAGS.eval_folder, 'result')
  os.makedirs(result_folder, exist_ok=True)
  with open(os.path.join(result_folder, f'report_{FLAGS.model_name}.csv'),
            'w') as f:
    writer = csv.writer(f)
    writer.writerows(report)
  with open(os.path.join(result_folder, f'debug_{FLAGS.model_name}.json'),
            'w') as f:
    json.dump(debug, f)


if __name__ == "__main__":
  app.run(main)
