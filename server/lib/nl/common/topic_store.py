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
"""Router for Topic API between cache and KG"""

import logging
from typing import Dict, List

from flask import current_app

from server.lib import fetch
from server.lib.nl.common import utils


def members(nodes: List[str],
            prop: str,
            ordered: bool = False) -> Dict[str, List[str]]:
  val_map = {}

  if ordered and 'TOPIC_CACHE' in current_app.config and current_app.config[
      'TOPIC_CACHE']:
    logging.info('calling CACHE')
    for n in nodes:
      resp = current_app.config['TOPIC_CACHE'].get_members(n)
      val_map[n] = [v['dcid'] for v in resp]
    nodes_copy = [n for n, v in val_map.items() if not v]
  else:
    nodes_copy = nodes

  if nodes_copy and ordered:
    val_map.update(_prop_val_ordered(nodes_copy, prop + 'List'))
    nodes_copy = [n for n, v in val_map.items() if not v]

  if nodes_copy:
    val_map.update(fetch.property_values(nodes=nodes_copy, prop=prop))

  return val_map


def members_raw(nodes: List[str], prop: str) -> Dict[str, List[str]]:
  val_map = {}

  if 'TOPIC_CACHE' in current_app.config and current_app.config['TOPIC_CACHE']:
    for n in nodes:
      val_map[n] = current_app.config['TOPIC_CACHE'].get_members(n)
    nodes_copy = [n for n, v in val_map.items() if not v]
  else:
    nodes_copy = nodes

  if nodes_copy:
    val_map.update(fetch.raw_property_values(nodes=nodes_copy, prop=prop))

  return val_map


def parents_raw(nodes: List[str], prop: str) -> Dict[str, List[Dict]]:
  parent_list = []
  nodes_copy = []

  if 'TOPIC_CACHE' in current_app.config and current_app.config['TOPIC_CACHE']:
    for n in nodes:
      plist = current_app.config['TOPIC_CACHE'].get_parents(n, prop)
      if not plist:
        nodes_copy.append(n)
      parent_list.extend(plist)
  else:
    nodes_copy = nodes

  if nodes_copy:
    parents = fetch.raw_property_values(nodes=nodes_copy, prop=prop, out=False)
    for pvals in parents.values():
      for p in pvals:
        if 'value' in p:
          del p['value']
        if 'dcid' not in p:
          continue
        if ((prop == 'relevantVariable' and not utils.is_topic(p['dcid'])) or
            (prop == 'member' and not utils.is_svpg(p['dcid']))):
          continue
        parent_list.append(p)

  return parent_list


# Reads Props that are strings encoding ordered DCIDs.
def _prop_val_ordered(nodes: List[str], prop: str) -> Dict[str, List[str]]:
  resp = fetch.property_values(nodes=nodes, prop=prop)
  svs_map = {}
  for sv, sv_list in resp.items():
    if sv_list:
      sv_list = sv_list[0]
      svs_map[sv] = [v.strip() for v in sv_list.split(',') if v.strip()]
    else:
      svs_map[sv] = []
  return svs_map
