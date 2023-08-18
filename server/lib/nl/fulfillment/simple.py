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
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance

# Number of variables to plot in a chart (largely Timeline chart)
_MAX_VARS_PER_CHART = 5


def populate(state: PopulateState, chart_vars: ChartVars, places: List[Place],
             chart_origin: ChartOriginType) -> bool:
  logging.info('populate_cb for simple')
  if not state.uttr.svs and not state.uttr.places:
    # If both the SVs and places are empty, then do not attempt to fulfill.
    # This avoids using incorrect context for unrelated queries like
    # [meaning of life]
    state.uttr.counters.err('simple_failed_noplaceandsv', 1)
    return False

  if chart_vars.event:
    # This can happen if an event is part of a topic and it can be triggered
    # on a non-contained-in and non-ranking query.
    return add_chart_to_utterance(ChartType.EVENT_CHART, state, chart_vars,
                                  places, chart_origin)

  exist_svs = ext.svs4place(state, places[0], chart_vars.svs).exist_svs
  if not exist_svs:
    state.uttr.counters.err('simple_failed_existence', 1)
    return False
  chart_vars.svs = exist_svs

  if len(chart_vars.svs) <= _MAX_VARS_PER_CHART:
    # For fewer SVs, comparing trends over time is nicer.
    chart_type = ChartType.TIMELINE_CHART
    chart_vars.response_type = "timeline"
  else:
    # When there are too many, comparing latest values is better
    # (than, say, breaking it into multiple timeline charts)
    chart_type = ChartType.BAR_CHART
    chart_vars.response_type = "bar chart"
  if chart_type == ChartType.TIMELINE_CHART:
    if chart_vars.has_single_point:
      # Demote to bar chart if single point.
      # TODO: eventually for single SV case, make it a highlight chart
      chart_type = ChartType.BAR_CHART
      chart_vars.response_type = "bar chart"
      state.uttr.counters.info('simple_timeline_to_bar_demotions', 1)

  if chart_vars.is_topic_peer_group:
    chart_vars.include_percapita = True

  return add_chart_to_utterance(chart_type, state, chart_vars, places,
                                chart_origin)
