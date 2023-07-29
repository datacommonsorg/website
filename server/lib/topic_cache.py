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
from typing import Dict, List, Set

from server.lib import fetch
from server.lib.nl.common import utils
from server.services import datacommons as dc

_BATCH_SIZE = 100


# This might be a topic or svpg
@dataclass
class Node:
  name: str
  vars: List[str]


class Cache:

  def __init__(self, out_map: Dict[str, Node], in_map: Dict[str, Set[str]]):
    self.out_map = out_map
    self.in_map = in_map

  def get_members(self, id: str):
    if id not in self.out_map:
      return []
    return self.out_map[id].vars

  def get_parents(self, id: str, prop: str):
    if id not in self.in_map:
      return []
    if prop not in self.in_map[id]:
      return []
    ret = []
    t = 'Topic' if prop == 'relevantVariable' else 'StatVarPeerGroup'
    for i in sorted(self.in_map[id][prop]):
      if i in self.out_map:
        n = self.out_map[i]
        ret.append({'dcid': i, 'name': n.name, 'types': [t]})
    return ret


def load() -> Cache:
  # TODO: Use pagination tokens for this.
  topic_ids = fetch.property_values(['Topic'], 'typeOf', out=False)['Topic']

  topics, svpg_ids = _triples(topic_ids, 'dc/svpg/')
  svpgs, _ = _triples(svpg_ids)
  out_map = topics
  out_map.update(svpgs)

  in_map = {}
  for id, node in out_map.items():
    prop = 'relevantVariable' if utils.is_topic(id) else 'member'
    for m in node.vars:
      if m not in in_map:
        in_map[m] = {}
      if prop not in in_map[m]:
        in_map[m][prop] = set()
      in_map[m][prop].add(id)

  return Cache(out_map=out_map, in_map=in_map)


def _triples(ids, prop, prefix=''):
  i = 0
  node_map = {}
  matched_ids = set()
  while i < len(ids):
    for dcid, pvs in fetch.triples(ids[i:i + _BATCH_SIZE]).list():
      name = pvs.get('name', [{}])[0].get('value', '')
      vars = []
      # Try the packed ordered list property, which has `List` suffix:
      # relevantVariableList, memberList
      var_list = pvs.get(prop + 'List', [{}])[0].get('value', '')
      if var_list:
        vars = [v.strip() for v in var_list.split(',') if v.strip()]
      else:
        vars = [v['dcid'] for v in pvs.get(prop, []) if v.get('dcid')]
      for v in vars:
        if v.startswith(prefix):
          matched_ids.add(v)
      if vars and name:
        node_map[dcid] = Node(name=name, vars=vars)
    i += _BATCH_SIZE

  return node_map, matched_ids
