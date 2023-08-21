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

import logging
from typing import List

import server.lib.explore.existence as ext
from server.lib.nl.common import rank_utils
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance

_MAX_VARS_IN_A_CHART = 20


#
# For ranking across vars, we should have detected a ranking, but not contained-in
# classification in the current utterance.  In the callback, we will also
# check that the SVs are part of a peer group (only those are comparable!).
# For example, [most grown agricultural things], again assuming california
# is in the context.
# TODO: consider checking for common units, especially when we rely on
#       auto-expanded peer groups of SVs.
#
def populate(state: PopulateState, chart_vars: ChartVars, places: List[Place],
             chart_origin: ChartOriginType) -> bool:
  logging.info('populate_cb for ranking_across_vars')
  if chart_vars.event:
    state.uttr.counters.err('ranking-across-vars_failed_cb_events', 1)
    return False
  if not state.ranking_types:
    state.uttr.counters.err('ranking-across-vars_failed_cb_norankingtypes', 1)
    return False
  if len(places) > 1:
    state.uttr.counters.err('ranking-across-vars_failed_cb_toomanyplaces',
                            [p.dcid for p in places])
    return False
  if state.place_type:
    state.uttr.counters.err('ranking-across-vars_failed_cb_hasplacetype',
                            state.place_type.value)
    return False
  if len(chart_vars.svs) < 2:
    state.uttr.counters.err('ranking-across-vars_failed_cb_toofewvars',
                            chart_vars.svs)
    return False
  if not chart_vars.is_topic_peer_group:
    state.uttr.counters.err('ranking-across-vars_failed_cb_notpeergroup',
                            chart_vars.svs)
    return False

  # TODO: Use ranking chart.
  # Ranking among peer group of SVs.
  eres = ext.svs4place(state, places[0], chart_vars.svs)
  if not eres.exist_svs:
    state.uttr.counters.err('ranking_across_vars_failed_existence', 1)
    return False
  # TODO: Add limit back after chart-config supports it natively.
  chart_vars.svs = eres.exist_svs

  return add_chart_to_utterance(ChartType.BAR_CHART, state, chart_vars, places,
                                chart_origin)
