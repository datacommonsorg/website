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
import logging
import os
from typing import Dict, List, Set

import requests

logging.getLogger().setLevel(logging.INFO)

_SDG_ROOT = "dc/g/SDG"
_SDG_TOPIC_JSON = '../../../server/config/nl_page/sdg_topic_cache.json'
API_ROOT = "https://autopush.api.datacommons.org"
API_PATH_SVG_INFO = API_ROOT + '/v1/bulk/info/variable-group'


def call_api(nodes):
  headers = {'Content-Type': 'application/json'}
  # Set MIXER_API_KEY to the autopush API key
  mixer_api_key = os.environ.get('MIXER_API_KEY', '')
  if mixer_api_key:
    headers['x-api-key'] = mixer_api_key
  # Send the request and verify the request succeeded
  req = {'nodes': nodes}
  response = requests.post(API_PATH_SVG_INFO, json=req, headers=headers)
  if response.status_code != 200:
    raise ValueError(
        'An HTTP {} code ({}) was returned by the mixer: "{}"'.format(
            response.status_code, response.reason, response.content))
  return response.json()


def _svg2t(svg):
  # NOTE: Use small "sdg" to avoid overlap with prior topics.
  return svg.replace('dc/g/SDG', 'dc/topic/sdg').replace('dc/g/', 'dc/topic/')


def download_svg_recursive(svgs: List[str], nodes: List[Dict],
                           processed: Set[str]):
  resp = call_api(svgs)

  recurse_nodes = set()
  for data in resp.get('data', []):
    svg_id = data.get('node', '')
    if not svg_id:
      continue

    info = data.get('info', '')
    if not info:
      continue

    tid = _svg2t(svg_id)
    if tid in processed:
      continue

    # TODO: Put stuff that has the same `pt` together.
    members = []
    for csv in info.get('childStatVars', []):
      if not csv.get('hasData') or not csv.get('id'):
        continue
      members.append(csv['id'])

    for csvg in info.get('childStatVarGroups', []):
      if not csvg.get('id'):
        continue
      members.append(_svg2t(csvg['id']))
      recurse_nodes.add(csvg['id'])

    nodes.append({
        'dcid': [tid],
        'name': [info.get('absoluteName', '')],
        'typeOf': ['Topic'],
        'relevantVariableList': members
    })
    processed.add(tid)

  if recurse_nodes:
    download_svg_recursive(sorted(list(recurse_nodes)), nodes, processed)


def download_sdg_svgs():
  nodes = []
  processed = set()
  download_svg_recursive([_SDG_ROOT], nodes, processed)
  return nodes


def main():
  nodes = download_sdg_svgs()
  nodes.sort(key=lambda x: x['dcid'])
  with open(_SDG_TOPIC_JSON, 'w') as fp:
    json.dump({'nodes': nodes}, fp, indent=2)


if __name__ == "__main__":
  main()
