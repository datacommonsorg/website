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
"""Module for Topic extension."""

import copy
from dataclasses import dataclass
from typing import Dict, List, Set

from server.lib.explore import existence
import server.lib.fetch as fetch
from server.lib.nl.common import variable
from server.lib.nl.common import variable_group
import server.lib.nl.common.topic as topic_lib
import server.lib.nl.fulfillment.types as ftypes

# A few limits to make sure we don't blow up things.
MAX_OPENED_TOPICS = 3
MAX_SVS_TO_ADD = 100
# 1 SVPG is equivalent to 4 SVs.
SVPG_TO_SV_EQUIVALENTS = 4

# Max PVs in an SV + 1
MAX_PVS = 11


# TODO: Tune this threshold for extending a topic with SVG.
def needs_extension(num_chart_vars: int, num_exist_svs: int) -> bool:
  return num_chart_vars <= 5 or num_exist_svs <= 10


# Given a list of topics, return chart-vars per-topic for the
# SVG members (which are Topic extensions).
def extend_topics(topics: List[str], existing_svs: Set[str],
                  override_svgs: List[str]) -> Dict[str, ftypes.ChartVars]:
  res = {}
  for t in topics[:MAX_OPENED_TOPICS]:
    # If override SVGs are set, use those, and attach to the
    # first topic we find.
    if override_svgs:
      cv_list = _extend_topic(t, override_svgs, existing_svs)
      if cv_list:
        res[t] = cv_list
      return res

    svgs = topic_lib.get_topic_extended_svgs(t)
    if svgs:
      cv_list = _extend_topic(t, svgs, existing_svs)
      if cv_list:
        res[t] = cv_list
  return res


def explore_more(seed_svs: List[str]) -> Dict[str, List[ftypes.ChartVars]]:
  if not seed_svs:
    return {}

  # Get parent SVGs.
  sv2svgs = fetch.property_values(seed_svs, "memberOf", True)

  # Collect all SVGs.
  all_svgs = []
  for svgs in sv2svgs.values():
    all_svgs.extend(svgs)
  all_svgs = list(set(all_svgs))

  # Open SVGs recursively into vars.
  result = variable_group.open_svgs(all_svgs)

  # Group the vars into peer-groups that is one step away from seed_svs
  seed_info = group_into_next_peers(result, seed_svs)

  # Construct chart_vars for these.
  chart_vars_list_map = {}
  for seed in seed_info.values():
    sv = seed.defn.id
    chart_vars_list_map[sv] = []
    for peer, peer_info in seed.peergrp.items():
      chart_vars_list_map[sv].append(
          ftypes.ChartVars(svs=list(peer_info),
                           source_topic=peer,
                           orig_sv=sv,
                           is_topic_peer_group=True))

  return chart_vars_list_map


def _extend_topic(topic: str, svgs: List[str],
                  existing_svs: Set[str]) -> List[ftypes.ChartVars]:
  # 1. Open SVGs recursively into vars.
  result = variable_group.open_svgs(svgs)

  # 2. Group them into SVPGs (peer groups) based on schema.
  #    Importantly don't rely on SVG structure because of
  #    folding optimizations.
  groups = group_into_svpg(result)

  # 3. Build chart vars from up to a limit.
  processed = copy.deepcopy(existing_svs)
  return build_chart_vars(topic, groups, processed)


@dataclass
class SeedSVInfo:
  defn: variable.SV
  peergrp: Dict[str, Set[str]]


# Returns: seed_sv -> (defn, List(prop, defn))
def group_into_next_peers(open_svg_result: Dict, seed_svs: List[str]):
  # Collect the results into SVPGs.
  # 1. sort by #pvs
  vars: List[variable.SV] = list(open_svg_result.values())
  vars.sort(key=lambda x: len(x.pvs))

  seed_info: Dict[str, SeedSVInfo] = {}
  for v in vars:
    if v.id in seed_svs:
      seed_info[v.id] = SeedSVInfo(v, {})

  for v in vars:
    if v.mp == v.id or v.pt == 'Thing':
      # This is schemaless, but at the very end.
      continue
    if not v.pvs:
      # If no-pvs this cannot be an peer.
      continue

    for seed in seed_info.values():
      prop = is_next_peer(seed.defn, v)
      if prop:
        if prop not in seed.peergrp:
          seed.peergrp[prop] = set()
        seed.peergrp[prop].add(v.id)

  return seed_info


def is_next_peer(seed: variable.SV, peer: variable.SV) -> str:
  if len(seed.pvs) != len(peer.pvs) - 1:
    return None
  if seed.mp != peer.mp:
    return None
  if seed.st != peer.st:
    return None
  if seed.pt != peer.pt:
    return None
  if seed.md != peer.md:
    return None
  if seed.mq != peer.mq:
    return None
  for seed_p, seed_v in seed.pvs.items():
    if peer.pvs.get(seed_p, '') != seed_v:
      return None
  # OK! this is the right peer, return the prop now.
  for peer_p in peer.pvs:
    if peer_p not in seed.pvs:
      return peer_p
  return None


def group_into_svpg(open_svg_result: Dict) -> List[Dict[str, Set[str]]]:
  # Collect the results into SVPGs.
  # 1. sort by #pvs
  vars: List[variable.SV] = list(open_svg_result.values())
  vars.sort(key=lambda x: len(x.pvs))

  # 2. group-by common keys.
  groups = []
  for i in range(MAX_PVS):
    groups.append({})
  for v in vars:
    if v.mp == v.id or v.pt == 'Thing':
      # This is schemaless, but at the very end.
      groups[MAX_PVS - 1][v.id] = set([v.id])
      continue

    if not v.pvs:
      # This is schemaful no-PV SV.
      groups[0][v.id] = set([v.id])
      continue

    l = len(v.pvs) - 1
    for i in range(l + 1):
      k = _key(v, i)
      if k not in groups[l]:
        groups[l][k] = set()
      groups[l][k].add(v.id)

  return groups


def build_chart_vars(topic: str, groups: List[Dict[str, Set[str]]],
                     processed: Set[str]) -> List[ftypes.ChartVars]:
  chart_vars_list = []
  added_sv_weight = 0
  for pvgrp in groups:
    svgrps = list(pvgrp.values())
    svgrps.sort(key=lambda k: len(k), reverse=True)
    for svgrp in svgrps:
      if len(svgrp) == 1:
        added_sv_weight += 1
      else:
        added_sv_weight += SVPG_TO_SV_EQUIVALENTS
      svs = list(svgrp)
      svs.sort()
      if len(svs) == 1:
        if svs[0] in processed:
          continue
        chart_vars_list.append(
            ftypes.ChartVars(svs=svs,
                             orig_sv=topic,
                             source_topic=topic,
                             is_topic_peer_group=False))
      elif len(svs) > 1:
        chart_vars_list.append(
            ftypes.ChartVars(svs=svs,
                             source_topic=topic,
                             orig_sv=topic,
                             is_topic_peer_group=True))
      processed.update(svs)
      if added_sv_weight > MAX_SVS_TO_ADD:
        return chart_vars_list

  return chart_vars_list


def _key(sv: variable.SV, i: int) -> str:
  key_list = [sv.pt, sv.mp, sv.st, sv.mq, sv.md]
  for j, p in enumerate(sorted(sv.pvs)):
    key_list.append(p)
    if i == j:
      key_list.append('_')
    else:
      key_list.append(sv.pvs[p])
  return ';'.join(key_list)


def chart_vars_to_explore_peer_groups(
    state: ftypes.PopulateState,
    explore_more_chart_vars_map: Dict[str, ftypes.ChartVars]) -> Dict:
  explore_peer_groups = {}

  for sv, cv_list in explore_more_chart_vars_map.items():
    if not existence.svs4place(state, state.uttr.places[0], [sv]).exist_svs:
      continue
    for cv in cv_list:
      er = existence.svs4place(state, state.uttr.places[0], cv.svs)
      if len(er.exist_svs) < 2:
        continue
      if sv not in explore_peer_groups:
        explore_peer_groups[sv] = {}
      if cv.source_topic not in explore_peer_groups[sv]:
        explore_peer_groups[sv][cv.source_topic] = sorted(er.exist_svs)

  return explore_peer_groups
