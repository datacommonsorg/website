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
#
# An in-memory cache for topics.
#

from dataclasses import dataclass
import json
from typing import Dict, List, Set

from server.lib.explore.params import DCNames
from server.lib.nl.common import utils


# This might be a topic or svpg
@dataclass
class Node:
  name: str
  type: str
  vars: List[str]


# Keyed by DC.
TOPIC_CACHE_FILES = {
    DCNames.MAIN_DC.value: 'server/config/nl_page/topic_cache.json',
    DCNames.SDG_DC.value: 'server/config/nl_page/sdg_topic_cache.json',
    DCNames.SDG_MINI_DC.value: 'server/config/nl_page/sdgmini_topic_cache.json',
}


class TopicCache:

  def __init__(self, out_map: Dict[str, Node], in_map: Dict[str, Set[str]]):
    self.out_map = out_map
    self.in_map = in_map

  def get_members(self, id: str):
    if id not in self.out_map:
      return []

    ret = []
    for nid in self.out_map[id].vars:
      if utils.is_topic(nid):
        t = 'Topic'
      elif utils.is_svpg(nid):
        t = 'StatVarPeerGroup'
      else:
        t = 'StatisticalVariable'
      if nid in self.out_map:
        name = self.out_map[nid].name
      else:
        name = ''
      ret.append({'dcid': nid, 'name': name, 'types': [t]})
    return ret

  def get_parents(self, id: str, prop: str):
    if id not in self.in_map:
      return []
    if prop not in self.in_map[id]:
      return []
    ret = []
    for i in sorted(self.in_map[id][prop]):
      if i in self.out_map:
        n = self.out_map[i]
        ret.append({'dcid': i, 'name': n.name, 'types': [n.type]})
    return ret

  def get_name(self, id: str) -> str:
    if id not in self.out_map:
      return ''
    return self.out_map[id].name


def load_file(fpath: str, name_overrides: Dict) -> TopicCache:
  with open(fpath, 'r') as fp:
    cache = json.load(fp)

  out_map = {}
  in_map = {}

  for node in cache['nodes']:
    dcid = node['dcid'][0]
    typ = node['typeOf'][0]
    name = node.get('name', [''])[0]
    if name_overrides.get(dcid):
      name = name_overrides.get(dcid)
    if 'relevantVariableList' in node:
      prop = 'relevantVariableList'
    else:
      prop = 'memberList'
    vars = node[prop]
    out_map[dcid] = Node(name=name, type=typ, vars=vars)

    # Make the *List transparent to the caller.
    new_prop = prop.replace('List', '')
    for m in vars:
      if m not in in_map:
        in_map[m] = {}
      if new_prop not in in_map[m]:
        in_map[m][new_prop] = set()
      in_map[m][new_prop].add(dcid)

  return TopicCache(out_map=out_map, in_map=in_map)


def load(name_overrides: Dict) -> Dict[str, TopicCache]:
  topic_cache_map = {}
  for dc, fpath in TOPIC_CACHE_FILES.items():
    topic_cache_map[dc] = load_file(fpath, name_overrides)
  return topic_cache_map
