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

from collections import OrderedDict
from dataclasses import dataclass
import time
from typing import List, Set, Tuple

import server.lib.nl.common.topic as topic
import server.lib.nl.common.utils as cutils
from server.lib.nl.explore.params import DCNames
from server.lib.nl.explore.params import is_sdg
from server.lib.nl.explore.params import is_special_dc
from server.lib.nl.explore.params import Params
import server.lib.nl.fulfillment.types as ftypes

_MAX_CORRELATION_SVS_PER_TOPIC = 4

# This is for main.
_MAX_SUBTOPIC_SV_LIMIT = 3
_MAX_TOPICS_TO_OPEN = 3

# Pick a higher limit for SDG / Special DC
_MAX_SUBTOPIC_SV_LIMIT_SDG = 500

# We open many more topics for Special DC because
# it combines topics from multiple sources (WHO, SDG,
# ILO, etc).  But as a limit we have a total #var limit.
_MAX_TOPICS_TO_OPEN_SPECIAL_DC = 10
_MAX_SUBTOPIC_SV_LIMIT_SPECIAL_DC = 100
_MAX_SVS_TO_PROCESS = 500


@dataclass
class TopicMembers:
  svs: List[str]
  svpgs: List[str]
  topics: List[str]


def compute_chart_vars(
    state: ftypes.PopulateState) -> OrderedDict[str, List[ftypes.ChartVars]]:
  num_topics_limit = _max_topics_to_open(state.uttr)

  dc = state.uttr.insight_ctx.get(Params.DC.value, DCNames.MAIN_DC.value)
  chart_vars_map = OrderedDict()
  num_topics_opened = 0
  num_svs_processed = 0
  for sv in state.uttr.svs:
    cv = []
    if cutils.is_sv(sv):
      cv = [ftypes.ChartVars(svs=[sv], orig_sv_map={sv: [sv]})]
    elif num_topics_opened < num_topics_limit:
      start = time.time()
      cv = _topic_chart_vars(state=state,
                             sv=sv,
                             source_topic=sv,
                             orig_sv=sv,
                             dc=dc)
      state.uttr.counters.timeit('topic_calls', start)
      if cv:
        num_topics_opened += 1
    if cv:
      for e in cv:
        num_svs_processed += len(e.svs)
      chart_vars_map[sv] = cv
    if num_svs_processed >= _MAX_SVS_TO_PROCESS:
      break
  return chart_vars_map


def compute_correlation_chart_vars(
    state: ftypes.PopulateState) -> OrderedDict[str, List[ftypes.ChartVars]]:
  # Note: This relies on the construction of multi-sv in `construct()`
  chart_vars_map = OrderedDict()

  # Get dual-SV candidate.
  lhs_svs, rhs_svs = [], []
  for c in state.uttr.multi_svs.candidates:
    if len(c.parts) == 2:
      lhs_svs = c.parts[0].svs
      rhs_svs = c.parts[1].svs
      break
  if not lhs_svs or not rhs_svs:
    return chart_vars_map

  # To not go crazy with api calls, don't handle more than one topic on each
  # side.
  added_pairs = set()
  found_lhs_topic = False
  found_rhs_topic = False
  lhs_svs, rhs_svs = _match_lists(lhs_svs, rhs_svs)
  for lsv, rsv in zip(lhs_svs, rhs_svs):
    cvlist = _compute_correlation_chart_vars_for_pair(state, lsv, rsv,
                                                      added_pairs)
    chart_vars_map.setdefault(lsv, []).extend(cvlist)

    found_lhs_topic |= cutils.is_topic(lsv)
    found_rhs_topic |= cutils.is_topic(rsv)
    if found_lhs_topic and found_rhs_topic:
      break

  return chart_vars_map


# Matches lists by repeating the first entry of the shorter list.
def _match_lists(l1: List[str], l2: List[str]) -> Tuple[List[str], List[str]]:
  if len(l1) < len(l2):
    new_l1 = l1 + [l1[0]] * (len(l2) - len(l1))
    return new_l1, l2
  if len(l2) < len(l1):
    new_l2 = l2 + [l2[0]] * (len(l1) - len(l2))
    return l1, new_l2
  return l1, l2


#
# Compute correlation chart-vars for a given pair of LHS and RHS var
# that are user-provided. Note that either/both of them can be a topic.
#
def _compute_correlation_chart_vars_for_pair(state: ftypes.PopulateState,
                                             lhs_orig: str, rhs_orig: str,
                                             added_pairs: Set[str]):
  dc = state.uttr.insight_ctx.get(Params.DC.value, DCNames.MAIN_DC.value)

  # Get vars.
  def _vars(v):
    if cutils.is_sv(v):
      return [v]
    else:
      svs = []
      _open_topic_lite(state, v, dc, svs)
      return svs[:_MAX_CORRELATION_SVS_PER_TOPIC]

  lhs_svs = _vars(lhs_orig)
  rhs_svs = _vars(rhs_orig)

  # Mix and match them.
  chart_vars = []

  def _add(lsv, rsv):
    # Ensure sv1,sv2 vs. sv2,sv1 are deduped
    k = ''.join(sorted([lsv, rsv]))
    if lsv == rsv or k in added_pairs:
      return
    added_pairs.add(k)
    chart_vars.append(
        ftypes.ChartVars(svs=[lsv, rsv],
                         orig_sv_map={
                             lhs_orig: [lsv],
                             rhs_orig: [rsv]
                         }))

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
                     dc: str,
                     ret_svs: List[str],
                     lvl: int = 0):
  if lvl == 0:
    topic_vars = topic.get_topic_vars(sv, dc)
  else:
    assert lvl < 2, "Must never recurse past 2 levels"
    topic_vars = topic.get_topic_vars_recurive(sv, rank=0, dc=dc, max_svs=1)

  members = _classify_topic_members(topic_vars, dc)

  if members.svs or members.svpgs:
    ret_svs.extend(members.svs)
    for (_, svs) in members.svpgs:
      ret_svs.extend(svs)
    if len(ret_svs) >= _MAX_CORRELATION_SVS_PER_TOPIC:
      return

  # We need to open up topics.
  for t in members.topics:
    _open_topic_lite(state, t, dc, ret_svs, lvl + 1)
    if len(ret_svs) >= _MAX_CORRELATION_SVS_PER_TOPIC:
      return


#
# This is an involved function to construct a list of ChartVars
# for topics.
#
def _topic_chart_vars(state: ftypes.PopulateState,
                      sv: str,
                      source_topic: str,
                      orig_sv: str,
                      dc: str,
                      lvl: int = 0) -> List[ftypes.ChartVars]:
  if lvl == 0:
    # This is the requested topic, just get the immediate members.
    topic_vars = topic.get_topic_vars(sv, dc)
  else:
    # This is an immediate sub-topic of the parent topic. Here,
    # we recurse along the topic-descendents to get a limited
    # number of vars.
    assert lvl < 2, "Must never recurse past 2 levels"
    topic_vars = topic.get_topic_vars_recurive(
        sv, rank=0, dc=dc, max_svs=_max_subtopic_sv_limit(state))

  # Classify the members into `TopicMembers` struct.
  topic_members = _classify_topic_members(topic_vars, dc)

  charts = []

  # First produce charts for SVs and SVPGs.
  if topic_members.svs or topic_members.svpgs:
    charts.extend(
        _direct_chart_vars(svs=topic_members.svs,
                           svpgs=topic_members.svpgs,
                           source_topic=source_topic,
                           orig_sv=orig_sv))

  # Recurse into immediate sub-topics.
  for t in topic_members.topics:
    charts.extend(
        _topic_chart_vars(state=state,
                          sv=t,
                          source_topic=t,
                          orig_sv=orig_sv,
                          lvl=lvl + 1,
                          dc=dc))

  state.uttr.counters.info(
      'topics_processed', {
          sv: {
              'svs': topic_members.svs,
              'peer_groups': topic_members.svpgs,
              'sub_topics': topic_members.topics,
          }
      })
  return charts


def _classify_topic_members(topic_vars: List[str], dc: str) -> TopicMembers:
  peer_groups = topic.get_topic_peergroups(topic_vars, dc)

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


def _direct_chart_vars(svs: List[str], svpgs: List[str], source_topic: str,
                       orig_sv: str) -> ftypes.ChartVars:
  # We need a category called overview.
  # 1. Make a block for all SVs in just_svs
  charts = [
      ftypes.ChartVars(svs=svs,
                       orig_sv_map={orig_sv: svs},
                       source_topic=source_topic)
  ]

  # 2. Make a block for every peer-group in svpgs
  for (svpg, svs) in svpgs:
    charts.append(
        ftypes.ChartVars(svs=svs,
                         is_topic_peer_group=True,
                         svpg_id=svpg,
                         orig_sv_map={orig_sv: svs},
                         source_topic=source_topic))

  return charts


def _max_subtopic_sv_limit(state: ftypes.PopulateState) -> int:
  # If there was a limit specified in the insight context, use that limit.
  if state.uttr.insight_ctx.get(Params.MAX_TOPIC_SVS) != None:
    return state.uttr.insight_ctx[Params.MAX_TOPIC_SVS]
  # Otherwise, use default limits depending on the dc
  if is_sdg(state.uttr.insight_ctx):
    return _MAX_SUBTOPIC_SV_LIMIT_SDG
  if is_special_dc(state.uttr.insight_ctx):
    return _MAX_SUBTOPIC_SV_LIMIT_SPECIAL_DC
  return _MAX_SUBTOPIC_SV_LIMIT


def _max_topics_to_open(uttr: ftypes.Utterance) -> int:
  # If there was a limit specified in the insight context, use that limit.
  if uttr.insight_ctx.get(Params.MAX_TOPICS) != None:
    return uttr.insight_ctx[Params.MAX_TOPICS]
  # Otherwise, use default limits depending on the dc
  if not is_sdg(uttr.insight_ctx) and is_special_dc(uttr.insight_ctx):
    max_topics = _MAX_TOPICS_TO_OPEN_SPECIAL_DC
  elif uttr.places and cutils.is_us_place(uttr.places[0]):
    max_topics = _MAX_TOPICS_TO_OPEN - 1
  else:
    # Have a slightly higher limit for non-US places than US places,
    # since there are fewer vars.
    max_topics = _MAX_TOPICS_TO_OPEN
  return max_topics
