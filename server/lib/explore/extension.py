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

from typing import Dict, List

from server.lib.nl.common import topic
from server.lib.nl.common import variable
from server.lib.nl.common import variable_group
import server.lib.nl.fulfillment.types as ftypes


# Max PVs in an SV + 1
MAX_PVS = 11
MAX_SV_EQUIVALENTS = 12
# 1 SVPG is equivalent to 4 SVs.
SVPG_TO_SV_EQUIVALENTS = 4


def extend_topics(topics: List[str],
                  state: ftypes.PopulateState,
                  places: Dict[str, str]) -> List[ftypes.ChartVars]:
  for t in topics:
    svgs = topic.get_topic_extended_svgs(t)
    if svgs:
      cv_list = _extend_topic(t, svgs, list(places.keys()))
      if cv_list:
        _update_exist_states(cv_list, state, places)
        return cv_list
  return []


def _update_exist_states(cv_list: List[ftypes.ChartVars], state: ftypes.PopulateState,
                         places: Dict[str, str]):
  for pk in sorted(list(set(places.values()))):
    for cv in cv_list:
      for sv in cv.svs:
        if sv not in state.exist_checks:
          state.exist_checks[sv] = {}
        if pk not in state.exist_checks[sv]:
          # Be conservative and claim single-point
          state.exist_checks[sv][pk] = True


def _extend_topic(topic: str, svgs: List[str], places: List[str]) -> List[ftypes.ChartVars]:
  result = variable_group.open_svgs(svgs, places)

  # Collect the results into SVPGs.
  # 1. sort by #pvs
  vars: List[variable.SV] = list(result.values())
  vars.sort(key=lambda x : len(x.pvs))

  # 2. group-by common keys.
  groups = [{}] * MAX_PVS
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

  added_sv_weight = 0
  processed = set()
  chart_vars_list = []
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
      if svs == 1:
        if svs[0] in processed:
          continue
        chart_vars_list.append(
          ftypes.ChartVars(svs=svs,
                           orig_sv=topic,
                           source_topic=topic,
                           is_topic_peer_group=False)
        )
      elif len(svs) > 1:
        chart_vars_list.append(ftypes.ChartVars(svs=svs,
                         source_topic=topic,
                         orig_sv=topic,
                         is_topic_peer_group=True))
      processed.update(svs)
      if added_sv_weight > MAX_SV_EQUIVALENTS:
        return chart_vars_list

  return chart_vars_list


def _key(sv: variable.SV, i: int) -> str:
  key_list = [
      sv.pt, sv.mp, sv.st, sv.mq, sv.md
  ]
  for j, p in enumerate(sorted(sv.pvs)):
    key_list.append(p)
    if i == j:
      key_list.append('_')
    else:
      key_list.append(sv.pvs[p])
  return ';'.join(key_list)