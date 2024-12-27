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
from pathlib import Path

from absl import app
from absl import flags

import shared.lib.eval as lib_eval
import shared.model.api as model_api
import shared.model.loader as model_loader

FLAGS = flags.FLAGS

flags.DEFINE_string(
    'model_name', '',
    'Model name used for eval. Full list can be found in /shared/model/vertex_ai_models.yaml'
)

flags.DEFINE_string(
    'eval_folder', '',
    'The folder for a eval run. It should contain a golden.json file')


def main(_):
  eval_folder = FLAGS.eval_folder
  if not eval_folder:
    eval_folder = os.path.join(Path(__file__).parents[3], 'shared/eval/base')
  base_line = None
  with open(os.path.join(eval_folder, 'golden.json')) as f:
    base_line = json.load(f)
  models = model_loader.load_indexes()
  if FLAGS.model_name not in models:
    print('Model not found from the config')
    return
  model_info = models[FLAGS.model_name]

  debug = {}
  report = []
  for query, base_line_matches in base_line.items():
    print(query)
    vector_matches = model_api.vector_search(model_info, query)['matches']
    debug[query] = {'vectorSearch': vector_matches}
    ranked_stat_vars = []
    for item in vector_matches:
      if item['statVar'] not in ranked_stat_vars:
        ranked_stat_vars.append(item['statVar'])
    if len(ranked_stat_vars) > len(base_line_matches):
      ranked_stat_vars = ranked_stat_vars[:len(base_line_matches)]
    debug[query]['rankedStatVars'] = ranked_stat_vars
    ranking_score = lib_eval.accuracy(ranked_stat_vars, base_line_matches)
    report.append([query, ranking_score])

  result_folder = os.path.join(eval_folder, 'result')
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
