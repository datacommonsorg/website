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
import logging
import os
from typing import Dict, List, Set

from server.lib import fetch
from server.lib.nl.common import utils
from server.services import datacommons as dc

_BATCH_SIZE = 100

_CACHE_PATH = '~/.datacommons/'
_CACHE_EXPIRY = 3600 * 24  # Cache for 1 day
_CACHE_KEY = 'topic_cache'


# This might be a topic or svpg
@dataclass
class Node:
  name: str
  type: str
  vars: List[str]


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


def load(mixer_api_key) -> TopicCache:
  flask_env = os.environ.get('FLASK_ENV')
  use_cache = flask_env in ['local', 'integration_test', 'webdriver']

  dcache = None
  if use_cache:
    from diskcache import Cache
    dcache = Cache(_CACHE_PATH)
    dcache.expire()
    cache = dcache.get(_CACHE_KEY)
    if cache:
      logging.info('Using CACHED topic_cache')
      return cache

  cache = _load(mixer_api_key)

  if use_cache:
    dcache.set(_CACHE_KEY, cache, expire=_CACHE_EXPIRY)
  return cache


def _load(mixer_api_key) -> TopicCache:
  # TODO: Use pagination tokens for this.
  topic_ids = fetch.property_values(['Topic'],
                                    'typeOf',
                                    out=False,
                                    mixer_api_key=mixer_api_key)['Topic']

  topics, svpg_ids = _triples(topic_ids, 'relevantVariable', 'dc/svpg/',
                              mixer_api_key)
  svpgs, _ = _triples(list(svpg_ids), 'member', '', mixer_api_key)
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
  logging.info(f'Loaded {len(out_map)} out keys, {len(in_map)} in keys')

  return TopicCache(out_map=out_map, in_map=in_map)


def _triples(ids, prop, prefix='', mixer_api_key=''):
  i = 0
  node_map = {}
  matched_ids = set()
  while i < len(ids):
    trips = fetch.triples(ids[i:i + _BATCH_SIZE],
                          out=True,
                          mixer_api_key=mixer_api_key)
    for dcid, pvs in trips.items():
      name = pvs.get('name', [{}])[0].get('value', '')
      type = pvs.get('typeOf', [{}])[0].get('dcid', '')
      vars = []
      # Try the packed ordered list property, which has `List` suffix:
      # relevantVariableList, memberList
      var_list = pvs.get(prop + 'List', [{}])[0].get('value', '')
      if var_list:
        vars = [v.strip() for v in var_list.split(',') if v.strip()]
      else:
        vars = [v['dcid'] for v in pvs.get(prop, []) if v.get('dcid')]
      if prefix:
        for v in vars:
          if v.startswith(prefix):
            matched_ids.add(v)
      if vars and name:
        node_map[dcid] = Node(name=name, type=type, vars=vars)
    i += _BATCH_SIZE

  return node_map, list(matched_ids)
