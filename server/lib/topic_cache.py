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
import logging
from typing import Dict, List, Self, Set

from server.lib.nl.common import utils
from server.lib.nl.explore.params import DCNames
from shared.lib.custom_dc_util import get_custom_dc_topic_cache_path
from shared.lib.custom_dc_util import is_custom_dc
from shared.lib.gcs import download_gcs_file
from shared.lib.gcs import is_gcs_path


# This might be a topic or svpg
@dataclass
class Node:
  name: str
  type: str
  vars: List[str]
  extended_vars: List[str]

  # For testing.
  def json(self) -> Dict:
    return {
        'name': self.name,
        'type': self.type,
        'vars': self.vars,
        'extended_vars': self.extended_vars
    }


# Keyed by DC.
TOPIC_CACHE_FILES = {
    DCNames.MAIN_DC.value: [
        'server/config/nl_page/topic_cache.json',
        'server/config/nl_page/sdg_topic_cache.json'
    ],
    DCNames.SDG_DC.value: ['server/config/nl_page/sdg_topic_cache.json'],
    DCNames.SDG_MINI_DC.value: [
        'server/config/nl_page/sdgmini_topic_cache.json'
    ],
    DCNames.UNDATA_DC.value: [
        'server/config/nl_page/sdg_topic_cache.json',
        'server/config/nl_page/undata_topic_cache.json',
        'server/config/nl_page/undata_enum_topic_cache.json',
    ],
    DCNames.BIO_DC.value: [
        'server/config/nl_page/topic_cache.json',
        'server/config/nl_page/sdg_topic_cache.json'
    ]
}

# TODO: Move this to schema
_EXTENDED_SVG_OVERRIDE_MAP = {
    'dc/topic/Employment': ['dc/g/Employment'],
    'dc/topic/Economy': [
        'dc/g/Currency', 'dc/g/Debt', 'dc/g/EconomicActivity', 'dc/g/Stock',
        'dc/g/Remittance'
    ],
    'dc/topic/GlobalEconomicActivity': [
        'dc/g/EconomicActivity', 'dc/g/Stock', 'dc/g/Remittance'
    ]
}


class TopicCache:

  def __init__(self, dc: str, out_map: Dict[str, Node],
               in_map: Dict[str, Dict[str, Set[str]]]):
    self.dc = dc
    self.out_map = out_map
    self.in_map = in_map

  def _merge(self, other: Self):
    logging.info(
        "Merging topic caches %s and %s: out maps (%s, %s), in maps (%s, %s).",
        self.dc, other.dc, len(self.out_map), len(other.out_map),
        len(self.in_map), len(other.in_map))
    self.out_map.update(other.out_map)
    self.in_map.update(other.in_map)
    logging.info("After merging topic caches: out map (%s), in map (%s).",
                 len(self.out_map), len(self.in_map))

  # For testing.
  def json(self) -> Dict:
    return {
        "out_map": {
            dcid: node.json() for dcid, node in sorted(self.out_map.items())
        },
        "in_map": {
            sv: {
                prop: sorted(dcids) for prop, dcids in props.items()
            } for sv, props in sorted(self.in_map.items())
        }
    }

  def get_members(self, id: str) -> List[Dict]:
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

  def get_extended_svgs(self, id: str) -> List[str]:
    if id not in self.out_map:
      return []
    if id in _EXTENDED_SVG_OVERRIDE_MAP:
      return _EXTENDED_SVG_OVERRIDE_MAP[id]
    return [nid for nid in self.out_map[id].extended_vars]

  def get_parents(self, id: str, prop: str) -> List[Dict]:
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


def load_files(fpath_list: List[str], name_overrides: Dict,
               dc: str) -> TopicCache:
  cache_nodes = []
  cache = {}
  for fpath in fpath_list:
    with open(fpath, 'r') as fp:
      cache = json.load(fp)
      cache_nodes.extend(cache['nodes'])

  out_map = {}
  in_map = {}

  # For custom dc caches, if a "dc" field is encoded in the cache, use that as the cache's name.
  # This is used to determine which main dc cache to merge with.
  if dc == DCNames.CUSTOM_DC.value:
    dc = cache.get("dc", dc)

  for node in cache_nodes:
    dcid = node['dcid'][0]
    typ = node['typeOf'][0]
    name = node.get('name', [''])[0]
    name_override_info = name_overrides.get(dcid)
    if name_override_info and not dc in name_override_info.get('blocklist', []):
      name = name_override_info.get('title', '')
    if 'relevantVariableList' in node:
      prop = 'relevantVariableList'
    else:
      prop = 'memberList'
    vars = node[prop]
    out_map[dcid] = Node(name=name, type=typ, vars=vars, extended_vars=[])

    # Make the *List transparent to the caller.
    new_prop = prop.replace('List', '')
    for m in vars:
      if m not in in_map:
        in_map[m] = {}
      if new_prop not in in_map[m]:
        in_map[m][new_prop] = set()
      in_map[m][new_prop].add(dcid)

  return TopicCache(dc=dc, out_map=out_map, in_map=in_map)


def load(name_overrides: Dict) -> Dict[str, TopicCache]:
  topic_cache_map: Dict[str, TopicCache] = {}
  for dc, fpath_list in TOPIC_CACHE_FILES.items():
    topic_cache_map[dc] = load_files(fpath_list, name_overrides, dc)

  if is_custom_dc():
    custom_dc_topic_cache = _load_custom_dc_topic_cache(name_overrides)
    if custom_dc_topic_cache:
      # Always maintain custom dc cache under the name "custom"
      topic_cache_map[DCNames.CUSTOM_DC.value] = custom_dc_topic_cache

      # Merge custom dc cache with the dc name specified in the cache.
      # If none was specified, than the name will be custom, in which case we merge with main.
      merge_dc = DCNames.MAIN_DC.value
      if custom_dc_topic_cache.dc != DCNames.CUSTOM_DC.value:
        merge_dc = custom_dc_topic_cache.dc
      topic_cache_map[merge_dc]._merge(custom_dc_topic_cache)

  return topic_cache_map


def _load_custom_dc_topic_cache(name_overrides: Dict) -> TopicCache:
  local_path = _get_local_custom_dc_topic_cache_path()
  if not local_path:
    return None
  return load_files([local_path], name_overrides, DCNames.CUSTOM_DC.value)


def _get_local_custom_dc_topic_cache_path() -> str:
  path = get_custom_dc_topic_cache_path()
  if not path:
    logging.info("No Custom DC topic cache path specified.")
    return path
  logging.info("Custom DC topic cache will be loaded from: %s", path)
  if is_gcs_path(path):
    return download_gcs_file(path)
  return path
