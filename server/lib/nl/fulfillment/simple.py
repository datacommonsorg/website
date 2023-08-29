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

import copy
from typing import List

import server.lib.explore.existence as ext
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance

# Number of variables to plot in a chart (largely Timeline chart)
_MAX_VARS_PER_CHART = 5


def populate(state: PopulateState, chart_vars: ChartVars, places: List[Place],
             chart_origin: ChartOriginType, _: int) -> bool:
  if not state.uttr.svs and not state.uttr.places:
    # If both the SVs and places are empty, then do not attempt to fulfill.
    # This avoids using incorrect context for unrelated queries like
    # [meaning of life]
    state.uttr.counters.err('simple_failed_noplaceandsv', 1)
    return False
  # Do not mutate the original.
  chart_vars = copy.deepcopy(chart_vars)

  if chart_vars.event:
    # This can happen if an event is part of a topic and it can be triggered
    # on a non-contained-in and non-ranking query.
    return add_chart_to_utterance(ChartType.EVENT_CHART, state, chart_vars,
                                  places, chart_origin)

  if chart_vars.is_topic_peer_group:
    eres = ext.svs4place(state, places[0], chart_vars.svs)
    if not eres.exist_svs:
      state.uttr.counters.err('simple_failed_existence', 1)
      return False
    chart_vars.svs = eres.exist_svs

    if len(chart_vars.svs) <= _MAX_VARS_PER_CHART:
      # For fewer SVs, comparing trends over time is nicer.
      chart_type = ChartType.TIMELINE_WITH_HIGHLIGHT
    else:
      # When there are too many, comparing latest values is better
      # (than, say, breaking it into multiple timeline charts)
      chart_type = ChartType.BAR_CHART
    chart_type = _maybe_demote(chart_type, eres.is_single_point, state)
    return add_chart_to_utterance(chart_type, state, chart_vars, places,
                                  chart_origin)
  else:
    # If its not a peer-group add one chart at a time.
    added = False
    all_svs = copy.deepcopy(chart_vars.svs)
    for sv in all_svs:
      chart_vars.svs = [sv]
      eres = ext.svs4place(state, places[0], chart_vars.svs)
      if not eres.exist_svs:
        state.uttr.counters.err('simple_failed_existence', 1)
        return False
      chart_type = _maybe_demote(ChartType.TIMELINE_WITH_HIGHLIGHT,
                                 eres.is_single_point, state)
      added |= add_chart_to_utterance(chart_type, state, chart_vars, places,
                                      chart_origin)
    return added


def _maybe_demote(chart_type: ChartType, is_single_point: bool,
                  state: PopulateState) -> ChartType:
  if chart_type == ChartType.TIMELINE_WITH_HIGHLIGHT and is_single_point:
    state.uttr.counters.info('simple_timeline_to_bar_demotions', 1)
    # Demote to bar chart if single point.
    # TODO: eventually for single SV case, make it a highlight chart
    return ChartType.BAR_CHART
  return chart_type
