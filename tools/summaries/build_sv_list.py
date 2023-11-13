# Copyright 2023 Google LLC
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
"""Filters place explorer chart configs for prompt generation.

Currently only saves Overview stat vars.
"""

import json
import logging
import os

from absl import app

PLACE_EXPLORER_CONFIG_PATH = "../../server/config/chart_config"

logging.getLogger().setLevel(logging.INFO)


def process_chart_config_list(config_json):
  results = {}
  for config in config_json:
    if not config.get('isOverview', False):
      continue

    category = config['category']
    if not results.get(category, None):
      results[category] = []
    result_list = results[category]

    for sv in config['statsVars']:
      result_list.append({
          'sv': sv,
          'unit': config.get('unit', ''),
          'scaling': config.get('scaling', ''),
      })
  return results


def process_chart_configs():
  results = {}
  with os.scandir(PLACE_EXPLORER_CONFIG_PATH) as files:
    for file in files:
      if not file.name.endswith('.json'):
        continue
      with open(os.path.join(PLACE_EXPLORER_CONFIG_PATH, file.name),
                'r') as jsonf:
        logging.info(f'Processing {file.name}')
        config = json.loads(jsonf.read())
        result = process_chart_config_list(config)
        for category, list in result.items():
          if not results.get(category, None):
            results[category] = list
          else:
            results[category].extend(list)

  with open('stat_vars.json', 'w') as outf:
    json.dump(results, outf, indent=2)


def main(_):
  process_chart_configs()


if __name__ == "__main__":
  app.run(main)
