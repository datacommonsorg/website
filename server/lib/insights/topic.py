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
"""Module for topic expansion"""

from dataclasses import dataclass
import time
from typing import Dict, List

import server.lib.nl.common.topic as topic
import server.lib.nl.common.utils as cutils
import server.lib.nl.fulfillment.types as ftypes

_MAX_CORRELATION_SVS_PER_TOPIC = 4


@dataclass
class TopicMembers:
  svs: List[str]
  svpgs: List[str]
  topics: List[str]


def compute_chart_vars(
    state: ftypes.PopulateState) -> Dict[str, List[ftypes.ChartVars]]:
  # Have a slightly higher limit for non-US places since there are fewer vars.
  num_topics_limit = 1 if cutils.is_us_place(state.uttr.places[0]) else 1

  chart_vars_map = {}
  num_topics_opened = 0
  for sv in state.uttr.svs:
    cv = []
    if cutils.is_sv(sv):
      cv = [ftypes.ChartVars(svs=[sv])]
    else:
      start = time.time()
      cv = _topic_chart_vars(state, sv)
      state.uttr.counters.timeit('topic_calls', start)
      num_topics_opened += 1
    if cv:
      chart_vars_map[sv] = cv
    if num_topics_opened >= num_topics_limit:
      break
  return chart_vars_map


def compute_correlation_chart_vars(
    state: ftypes.PopulateState) -> Dict[str, List[ftypes.ChartVars]]:
  # Note: This relies the construction of multi-sv in `construct()`
  chart_vars_map = {}
  lhs_svs = state.uttr.multi_svs.candidates[0].parts[0].svs
  rhs_svs = state.uttr.multi_svs.candidates[0].parts[1].svs

  # To not go crazy with num-svs, don't handle more than one topic on each
  # size.
  found_lhs_topic = False
  found_rhs_topic = False
  for lsv, rsv in zip(lhs_svs, rhs_svs):
    cvlist = _compute_correlation_chart_vars_for_pair(state, lsv, rsv)
    chart_vars_map[lsv] = cvlist

    found_lhs_topic |= cutils.is_topic(lsv)
    found_rhs_topic |= cutils.is_topic(rsv)
    if found_lhs_topic and found_rhs_topic:
      break

  return chart_vars_map


#
# Compute correlation chart-vars for a given pair of LHS and RHS var.
# Note that either/both of them can be a topic.
#
def _compute_correlation_chart_vars_for_pair(state: ftypes.PopulateState,
                                             lhs_sv: str, rhs_sv: str):
  # Get vars.
  def _vars(v):
    if cutils.is_sv(v):
      return [v]
    else:
      svs = []
      _open_topic_lite(state, v, svs)
      return svs[:_MAX_CORRELATION_SVS_PER_TOPIC]

  lhs_svs = _vars(lhs_sv)
  rhs_svs = _vars(rhs_sv)

  # Mix and match them.
  added = set()
  chart_vars = []

  def _add(lsv, rsv):
    # Ensure sv1,sv2 vs. sv2,sv1 are deduped
    k = ''.join(sorted([lsv, rsv]))
    if lsv == rsv or k in added:
      return
    added.add(k)
    chart_vars.append(ftypes.ChartVars(svs=[lsv, rsv]))

  # Try to avoid repeating SVs at the top of the page.
  for lsv, rsv in zip(lhs_svs, rhs_svs):
    _add(lsv, rsv)

  for lsv in lhs_svs:
    for rsv in rhs_svs:
      _add(lsv, rsv)

  return chart_vars


#
# A lighter version of _topic_chart_vars() that returns just sv list
# in |ret_svs|
#
def _open_topic_lite(state: ftypes.PopulateState,
                     sv: str,
                     ret_svs: List[str],
                     lvl: int = 0):
  if lvl == 0:
    topic_vars = topic.get_topic_vars(sv, ordered=True)
  else:
    assert lvl < 2, "Must never recurse past 2 levels"
    topic_vars = topic.get_topic_vars_recurive(sv,
                                               rank=0,
                                               ordered=True,
                                               max_svs=1)

  members = _classify_topic_members(topic_vars)

  if members.svs or members.svpgs:
    ret_svs.extend(members.svs)
    for (_, svs) in members.svpgs:
      ret_svs.extend(svs)
    if len(ret_svs) >= _MAX_CORRELATION_SVS_PER_TOPIC:
      return

  # We need to open up topics.
  for t in members.topics:
    _open_topic_lite(state, t, ret_svs, lvl + 1)
    if len(ret_svs) >= _MAX_CORRELATION_SVS_PER_TOPIC:
      return


#
# This is an involved function to construct a list of ChartVars
# for topics.
#
def _topic_chart_vars(state: ftypes.PopulateState,
                      sv: str,
                      lvl: int = 0) -> List[ftypes.ChartVars]:
  if lvl == 0:
    # This is the requested topic, just get the immediate members.
    topic_vars = topic.get_topic_vars(sv, ordered=True)
  else:
    # This is an immediate sub-topic of the parent topic. Here,
    # we recurse along the topic-descendents to get a limited
    # number of vars.
    assert lvl < 2, "Must never recurse past 2 levels"
    topic_vars = topic.get_topic_vars_recurive(sv,
                                               rank=0,
                                               ordered=True,
                                               max_svs=_MAX_SUBTOPIC_SV_LIMIT)

  # Classify the members into `TopicMembers` struct.
  topic_members = _classify_topic_members(topic_vars)

  charts = []

  # First produce charts for SVs and SVPGs.
  if topic_members.svs or topic_members.svpgs:
    st = sv
    if lvl == 0 and topic_members.topics:
      st = ''
    charts.extend(_direct_chart_vars(topic_members.svs, topic_members.svpgs,
                                     st))

  # Recurse into immediate sub-topics.
  for t in topic_members.topics:
    charts.extend(_topic_chart_vars(state, t, lvl + 1))

  state.uttr.counters.info(
      'topics_processed',
      {sv: {
          'svs': topic_members.svs,
          'peer_groups': topic_members.svpgs,
      }})
  return charts


def _classify_topic_members(topic_vars: List[str]) -> TopicMembers:
  peer_groups = topic.get_topic_peergroups(topic_vars, ordered=True)

  just_svs = []
  svpgs = []
  sub_topics = []
  for v in topic_vars:
    if cutils.is_topic(v):
      sub_topics.append(v)
    elif peer_groups.get(v):
      svpgs.append((v, peer_groups[v]))
    else:
      just_svs.append(v)
  return TopicMembers(svs=just_svs, svpgs=svpgs, topics=sub_topics)


_MAX_SUBTOPIC_SV_LIMIT = 3


def _direct_chart_vars(svs: List[str], svpgs: List[str],
                       topic: str) -> ftypes.ChartVars:
  # We need a category called overview.
  # 1. Make a block for all SVs in just_svs
  charts = [ftypes.ChartVars(svs=svs, source_topic=topic)]

  # 2. Make a block for every peer-group in svpgs
  for (svpg, svs) in svpgs:
    charts.append(
        ftypes.ChartVars(svs=svs,
                         include_percapita=False,
                         is_topic_peer_group=True,
                         svpg_id=svpg,
                         source_topic=topic))

  return charts
