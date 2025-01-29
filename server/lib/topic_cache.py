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
import os
from typing import Dict, List, Self, Set

from server.lib.nl.common import utils
from server.lib.nl.explore.params import DCNames
from shared.lib.custom_dc_util import get_custom_dc_topic_cache_path
from shared.lib.custom_dc_util import is_custom_dc
from shared.lib.gcs import is_gcs_path
from shared.lib.gcs import maybe_download


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
    DCNames.UNDATA_DEV_DC.value: [
        'server/config/nl_page/sdg_topic_cache.json',
        'server/config/nl_page/undata_topic_cache.json',
        'server/config/nl_page/undata_enum_topic_cache.json',
        'server/config/nl_page/undata_ilo_topic_cache.json'
    ],
    DCNames.UNDATA_ILO_DC.value: [
        'server/config/nl_page/undata_ilo_topic_cache.json'
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

  def __init__(self, out_map: Dict[str, Node],
               in_map: Dict[str, Dict[str, Set[str]]]):
    self.out_map = out_map
    self.in_map = in_map

  def merge(self, other: Self):
    logging.info("Merging topic caches: out maps (%s, %s), in maps (%s, %s).",
                 len(self.out_map), len(other.out_map), len(self.in_map),
                 len(other.in_map))
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


def load_files(dc: str, fpath_list: List[str],
               name_overrides: Dict) -> TopicCache:
  cache_nodes = []
  for fpath in fpath_list:
    with open(fpath, 'r') as fp:
      cache = json.load(fp)
      cache_nodes.extend(cache['nodes'])

  return _load_nodes(dc, cache_nodes, name_overrides)


def _load_nodes(dc: str, cache_nodes: List, name_overrides: Dict) -> TopicCache:

  out_map = {}
  in_map = {}

  for node in cache_nodes:
    dcid = node['dcid'][0]
    typ = node['typeOf'][0]
    name = node.get('name', [''])[0]
    name_override_info = name_overrides.get(dcid)
    if name_override_info and not dc in name_override_info.get('blocklist', []):
      name = name_override_info.get('title', '')
    if 'relevantVariableList' in node:
      prop = 'relevantVariableList'
    elif 'memberList' in node:
      prop = 'memberList'
    else:
      logging.warning(
          f"Node {dcid} missing both 'relevantVariableList' and 'memberList'")
      continue
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

  return TopicCache(out_map=out_map, in_map=in_map)


def load(name_overrides: Dict) -> Dict[str, TopicCache]:
  topic_cache_map: Dict[str, TopicCache] = {}
  for dc, fpath_list in TOPIC_CACHE_FILES.items():
    topic_cache_map[dc] = load_files(dc, fpath_list, name_overrides)

  if is_custom_dc():
    override_dc, custom_dc_topic_cache = _load_custom_dc_topic_cache(
        name_overrides)
    if override_dc and custom_dc_topic_cache:
      # Always maintain custom dc cache under the name "custom"
      topic_cache_map[DCNames.CUSTOM_DC.value] = custom_dc_topic_cache

      # Merge custom dc cache with the override_dc cache.
      topic_cache_map[override_dc].merge(custom_dc_topic_cache)

  return topic_cache_map


# Returns a tuple of DC to be overriden and TopicCache.
def _load_custom_dc_topic_cache(name_overrides: Dict) -> tuple[str, TopicCache]:
  local_path = _get_local_custom_dc_topic_cache_path()
  if not local_path:
    return (None, None)

  cache = {}
  with open(local_path, 'r') as fp:
    cache = json.load(fp)

  # If a "dc" field is specified, override that DC's cache.
  # Else override the main DC cache.
  override_dc = cache.get("dc", DCNames.MAIN_DC.value)
  topic_cache = _load_nodes(override_dc, cache['nodes'], name_overrides)
  return (override_dc, topic_cache)


def _get_local_custom_dc_topic_cache_path() -> str:
  path = get_custom_dc_topic_cache_path()

  if not path:
    logging.info("No Custom DC topic cache path specified.")
    return path

  logging.info("Custom DC topic cache will be loaded from: %s", path)

  if is_gcs_path(path):
    return maybe_download(path)

  if not os.path.exists(path):
    logging.warning(
        "Custom DC topic cache path %s does not exist and will be skipped.",
        path)
    # Loading topic cache is skipped if path is empty so return an empty path in this case.
    return ""

  return path
