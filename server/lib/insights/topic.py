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
"""Module for Insights fulfillment"""

from dataclasses import dataclass
from typing import List

import server.lib.nl.common.topic as topic
import server.lib.nl.common.utils as cutils
import server.lib.nl.fulfillment.types as ftypes


@dataclass
class TopicMembers:
  svs: List[str]
  svpgs: List[str]
  topics: List[str]


#
# This is an involved function to construct a list of ChartVars
# for topics.
#
def compute_chart_vars(state: ftypes.PopulateState,
                       sv: str,
                       lvl: int = 0) -> List[ftypes.ChartVars]:
  if lvl == 0:
    # This is the requested topic, just get the immediate members.
    topic_vars = topic.get_topic_vars(sv)
  else:
    # This is an immediate sub-topic of the parent topic. Here,
    # we recurse along the topic-descendents to get a limited
    # number of vars.
    assert lvl < 2, "Must never recurse past 2 levels"
    topic_vars = topic.get_topic_vars_recurive(sv,
                                               rank=0,
                                               max_svs=_MAX_SUBTOPIC_SV_LIMIT)

  # Classify the members into `TopicMembers` struct.
  topic_members = _classify_topic_members(topic_vars)

  charts = []

  # First produce charts for SVs and SVPGs.
  if topic_members.svs or topic_members.svpgs:
    st = sv
    if lvl == 0 and topic_members.topics:
      st = ''
    charts.extend(
        _charts_within_topic(topic_members.svs, topic_members.svpgs, st))

  # Recurse into immediate sub-topics.
  for t in topic_members.topics:
    charts.extend(compute_chart_vars(state, t, lvl + 1))

  state.uttr.counters.info(
      'topics_processed',
      {sv: {
          'svs': topic_members.svs,
          'peer_groups': topic_members.svpgs,
      }})
  return charts


def _classify_topic_members(topic_vars: List[str]) -> TopicMembers:
  peer_groups = topic.get_topic_peergroups(topic_vars)

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


def _charts_within_topic(svs: List[str], svpgs: List[str],
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
