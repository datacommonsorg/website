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

import time
from typing import Dict, List

from server.lib.nl.common import constants
from server.lib.nl.common import topic
from server.lib.nl.common import utils
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState

_EVENT_PREFIX = 'event/'


#
# Returns a map of var to ChartVars list corresponding to that topic/SV
#
# TODO: Unify with `compute_chart_vars` and `compute_correlation_chart_vars`.
#
def build_chart_vars_map(state: PopulateState) -> Dict[str, List[ChartVars]]:
  chart_vars_map = {}
  for rank, sv in enumerate(state.uttr.svs):
    chart_vars_map[sv] = build_chart_vars(state, sv, rank)
  return chart_vars_map


#
# Returns a list of ChartVars, where each ChartVars may be a single SV or
# group of SVs.
#
def build_chart_vars(state: PopulateState,
                     sv: str,
                     rank: int = 0) -> List[ChartVars]:
  if utils.is_sv(sv):
    return [ChartVars(svs=[sv])]
  if utils.is_topic(sv):
    start = time.time()
    topic_vars = topic.get_topic_vars_recurive(sv, rank)
    peer_groups = topic.get_topic_peergroups(topic_vars)

    # Classify into two lists.
    just_svs = []
    svpgs = []
    for v in topic_vars:
      if v in peer_groups and peer_groups[v]:
        title = topic.svpg_name(v)
        description = topic.svpg_description(v)
        svpgs.append((title, description, peer_groups[v]))
      else:
        just_svs.append(v)
    state.uttr.counters.timeit('topic_calls', start)

    # Group into blocks carefully:

    # 1. Make a block for all SVs in just_svs
    charts = []
    for v in just_svs:
      # Skip PC for this case (per prior implementation)
      svs = []
      event = None
      if v.startswith(_EVENT_PREFIX):
        config_key = v[len(_EVENT_PREFIX):]
        etype = constants.EVENT_CONFIG_KEY_TO_EVENT_TYPE.get(config_key, None)
        if not etype:
          continue
        event = etype
      else:
        svs = [v]
      charts.append(ChartVars(svs=svs, event=event, source_topic=sv))

    # 2. Make a block for every peer-group in svpgs
    for (title, description, svs) in svpgs:
      charts.append(
          ChartVars(svs=svs,
                    title=title,
                    description=description,
                    is_topic_peer_group=True,
                    source_topic=sv))

    state.uttr.counters.info('topics_processed',
                             {sv: {
                                 'svs': just_svs,
                                 'peer_groups': svpgs,
                             }})
    return charts

  return []
