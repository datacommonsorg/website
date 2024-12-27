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

import json
import logging
import os

import requests


def call_api(url, req):
  headers = {'Content-Type': 'application/json'}
  # Set DC_API_KEY to the autopush API key
  dc_api_key = os.environ.get('DC_API_KEY', '')
  if dc_api_key:
    headers['x-api-key'] = dc_api_key
  # Send the request and verify the request succeeded
  response = requests.post(url, json=req, headers=headers)
  if response.status_code != 200:
    raise ValueError(
        'An HTTP {} code ({}) was returned by the mixer: "{}"'.format(
            response.status_code, response.reason, response.content))
  return response.json()


def write_topic_json(topic_file: str, nodes: list):
  with open(topic_file, 'w') as fp:
    json.dump({'nodes': nodes}, fp, indent=2)


def write_topic_mcf(mcf_file: str, nodes: list[dict]) -> None:
  logging.info("Writing MCF to: %s", mcf_file)
  with open(mcf_file, 'w') as out:
    for node in nodes:
      out.write(_write_mcf_node(node))


def _write_mcf_node(node: dict) -> str:
  lines = []

  if node['typeOf'][0] == 'Topic':
    prop = 'relevantVariable'
  else:
    prop = 'member'
  list_prop = prop + 'List'

  lines.append(f"Node: dcid:{node['dcid'][0]}")

  if node[list_prop]:
    refs_str = ", ".join([f"dcid:{var}" for var in node[list_prop]])
    lines.append(f"{prop}: {refs_str}")

  lines.append(f'name: "{node["name"][0]}"')
  lines.append(f"typeOf: dcid:{node['typeOf'][0]}")

  lines.append("\n")
  return "\n".join(lines)