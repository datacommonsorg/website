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
from server.services import datacommons as dc

_BATCH_SIZE = 100

# This might be a topic or svpg
@dataclass
class Node:
  name: str
  vars: List[str]

@dataclass
class Cache:
  topic_map: Dict[str, Node]
  svpg_map: Dict[str, Node]
  sv2topic: Dict[str, Set[str]]


def load() -> Cache:
  # TODO: Use pagination tokens for this.
  topic_ids = fetch.property_values(['Topic'], 'typeOf', out=False)['Topic']

  topics, svpg_ids = _triples(topic_ids, 'dc/svpg/')
  svpgs, _ = _triples(svpg_ids)
  sv2topic = _sv2topic(topics, svpgs)

  return Cache(topic_map=topics, svpg_map=svpgs, sv2topic=sv2topic)


def _sv2topic(topics: Dict[str, Node], svpgs: Dict[str, Node]) -> Dict[str, Set]:
  sv2topic = {}
  svpg2topic = {}
  sv2svpg = {}
  for t, n in topics.items():
    for v in n.vars:
      if v.startswith('dc/svpg/'):
        if v not in svpg2topic:
          svpg2topic = set()
        svpg2topic[v].add(t)
      elif v.startswith('dc/topic/'):
        # Sub-topic. Nothing to track
        pass
      else:
        if v not in sv2topic:
          sv2topic = set()
        sv2topic[v].add(t)
  for s, n in svpgs.items():
    for v in n.vars:
      if s.startswith('dc/svpg/') or s.startswith('dc/topic/'):
        continue
      if v not in sv2svpg:
        sv2svpg[v] = set()
      sv2svpg[v].add(s)
  for v, s in sv2svpg.items():
    if s in svpg2topic:
      if v not in sv2topic:
        sv2topic = set()
      sv2topic[v].update(svpg2topic[s])
  return sv2topic

  
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