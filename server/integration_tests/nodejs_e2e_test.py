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
import json
import os
import unittest

import requests

_dir = os.path.dirname(os.path.abspath(__file__))

_TEST_MODE = os.environ['TEST_MODE']

_TEST_DATA = 'test_data/nodejs_query'


class IntegrationTest(unittest.TestCase):

  def run_test(self, test_dir, query):
    resp = requests.get(
        f'https://dev.datacommons.org/nodejs/query?q={query}').json()
    del resp['debug']
    for chart in resp.get('charts', []):
      self.assertNotEqual('', chart.get('svg', '')), chart
      chart['svg'] = ''
    json_file = os.path.join(_dir, _TEST_DATA, test_dir, 'screenshot.json')
    if _TEST_MODE == 'write':
      json_dir = os.path.dirname(json_file)
      if not os.path.isdir(json_dir):
        os.makedirs(json_dir)
      with open(json_file, 'w') as infile:
        infile.write(json.dumps(resp, indent=2))
    else:
      with open(json_file, 'r') as infile:
        expected = json.load(infile)
        a, b = (
            json.dumps(resp, sort_keys=True, indent=2),
            json.dumps(expected, sort_keys=True, indent=2),
        )
        self.maxDiff = None
        self.assertEqual(a, b)

  def test_main(self):
    self.run_test('timeline', 'family earnings in north dakota')
    self.run_test('bar', 'top jobs in santa clara county')
    self.run_test('map_rank', 'counties in california with highest obesity')
    self.run_test('scatter', 'obesity vs. poverty in counties of california')
    self.run_test('disaster', 'fires in california')
