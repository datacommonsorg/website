# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from datetime import datetime
import json
import logging
import os

from absl import app
from absl import flags
import requests

FLAGS = flags.FLAGS

OUTPUT_DIR = 'output'

flags.DEFINE_string('base_url', 'https://dev.datacommons.org',
                    'The base URL of the API server.')

flags.DEFINE_string('output_dir', OUTPUT_DIR,
                    'The output directory where results will be persisted.')

TEST_CASES = [{
    'name': 'timeline',
    'query': 'family earnings in north dakota'
}, {
    'name': 'timeline_all',
    'query': 'family earnings in north dakota',
    'all_charts': '1'
}, {
    'name': 'bar',
    "query": 'top jobs in santa clara county'
}, {
    'name': 'map_rank',
    'query': 'counties in california with highest obesity'
}, {
    'name': 'scatter',
    'query': 'obesity vs. poverty in counties of california'
}, {
    'name': 'scatter_non_bard',
    'query': 'obesity vs. poverty in counties of california',
    'client': 'dc'
}]


def run_test():
  os.makedirs(os.path.join(FLAGS.output_dir), exist_ok=True)
  for test_case in TEST_CASES:
    query = test_case.get('query', '')
    all_charts = test_case.get('all_charts', '')
    client = test_case.get('client', '')
    resp = requests.get(
        f'{FLAGS.base_url}/nodejs/query?q={query}&allCharts={all_charts}&client={client}'
    ).json()
    for chart in resp.get('charts', []):
      chart['chartUrl'] = ''
    file_name = test_case.get('name', '') + '.json'
    json_file = os.path.join(FLAGS.output_dir, file_name)
    with open(json_file, 'w') as out:
      out.write(json.dumps(resp))


def main(_):
  if not FLAGS.base_url:
    logging.error('base_url must be set to run this test.')
    return

  start = datetime.now()
  logging.info('Start: %s', start)

  run_test()

  end = datetime.now()
  logging.info('End: %s', end)
  logging.info('Duration: %s', str(end - start))


# TODO: add a script for triggering this test to run in GKE cron job
if __name__ == '__main__':
  app.run(main)
