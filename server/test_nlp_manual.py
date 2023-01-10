# Copyright 2022 Google LLC
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
"""
Script to test flow of nlp features.

How to run locally:
FLASK_ENV=local python test_nlp_manual.py
"""
import urllib.parse
from main import app


def _print_success(msg: str):
  print('=' * 80)
  print(msg)
  print('=' * 80)


def _encoded_q(query: str, embedding: str = 'us_filtered'):
  return urllib.parse.urlencode({'q': query, 'build': embedding})


def test_palo_alto_flow():
  query = "tell me about Palo Alto"
  response = app.test_client().post(f'/nl/data?{_encoded_q(query)}',
                                    json={'contextHistory': []},
                                    content_type='application/json')

  assert response.status_code == 200
  assert 'config' in response.json

  config = response.json['config']
  assert 'metadata' in config and 'placeDcid' in config['metadata']

  place_dcid = config['metadata']['placeDcid']
  assert place_dcid and place_dcid[0] == 'geoId/0655282'


def main():
  test_palo_alto_flow()
  _print_success('Palo Alto flow is succsesful.')


if __name__ == '__main__':
  main()
