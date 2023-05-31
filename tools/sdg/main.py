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

import logging
import os

from google.protobuf import text_format
import requests
from subject_page_pb2 import SubjectPageConfig
from subject_page_pb2 import Tile

logging.getLogger().setLevel(logging.INFO)

_SDG_ROOT = "dc/g/SDG"
API_ROOT = "https://autopush.api.datacommons.org"
API_PATH_SVG_INFO = API_ROOT + '/v1/bulk/info/variable-group'
_MAX_BLOCKS = 20
_MAX_SV_PER_SECTION = 3
_X_LABEL_LINK_ROOT = "/topic/sdg/"


def write_page_config(page_config):
  with open('sdg.textproto', 'w') as f:
    text_proto = text_format.MessageToString(page_config, indent=2)
    f.write(text_proto)


def post(url, req):
  headers = {'Content-Type': 'application/json'}
  # Set MIXER_API_KEY to the autopush API key
  mixer_api_key = os.environ.get('MIXER_API_KEY', '')
  if mixer_api_key:
    headers['x-api-key'] = mixer_api_key
  # Send the request and verify the request succeeded
  response = requests.post(url, json=req, headers=headers)
  if response.status_code != 200:
    raise ValueError(
        'An HTTP {} code ({}) was returned by the mixer: "{}"'.format(
            response.status_code, response.reason, response.content))
  return response.json()


def add_charts(svg_ids, category):
  if len(category.blocks) == _MAX_BLOCKS:
    return
  resp = post(API_PATH_SVG_INFO, {'nodes': svg_ids})
  for item in resp['data']:
    child_svs = item['info'].get('childStatVars', [])
    if child_svs:
      block = category.blocks.add()
      block.title = item['info']['absoluteName']
      for sv in child_svs[:_MAX_SV_PER_SECTION]:
        column = block.columns.add()
        tile = column.tiles.add()
        tile.type = Tile.TileType.BAR
        tile.stat_var_key.append(sv['id'])
        tile.title = sv['displayName']
        tile.bar_tile_spec.x_label_link_root = _X_LABEL_LINK_ROOT
        spec = category.stat_var_spec[sv['id']]
        spec.stat_var = sv['id']
        spec.name = sv['displayName']
    else:
      child_svgs = item['info'].get('childStatVarGroups')
      if child_svgs:
        add_charts([x['id'] for x in child_svgs], category)


def build_config():
  page_config = SubjectPageConfig()
  page_config.metadata.topic_id = 'sdg'
  page_config.metadata.topic_name = 'Sustainable Development Goals'
  resp = post(API_PATH_SVG_INFO, {'nodes': [_SDG_ROOT]})
  if not resp['data']:
    return page_config
  root = resp['data'][0]['info']
  for svg in root['childStatVarGroups']:
    print(svg['id'])
    category = page_config.categories.add()
    category.title = svg.get('displayName', '')
    add_charts(svg['id'], category)
  return page_config


def main():
  page_config = build_config()
  write_page_config(page_config)


if __name__ == "__main__":
  main()
