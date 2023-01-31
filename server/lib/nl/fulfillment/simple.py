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

from typing import List

from lib.nl.nl_detection import Place
from lib.nl.nl_utterance import Utterance, ChartOriginType, ChartType

from lib.nl.fulfillment.base import populate_charts, PopulateState, ChartVars, \
  add_chart_to_utterance

# Number of variables to plot in a chart (largely Timeline chart)
_MAX_VARS_PER_CHART = 5


def populate(uttr: Utterance) -> bool:
  return populate_charts(
      PopulateState(uttr=uttr, main_cb=_populate_cb, fallback_cb=_fallback_cb))


def _populate_cb(state: PopulateState, chart_vars: ChartVars,
                 places: List[Place], chart_origin: ChartOriginType) -> bool:
  if len(chart_vars.svs) <= _MAX_VARS_PER_CHART:
    # For fewer SVs, comparing trends over time is nicer.
    chart_type = ChartType.TIMELINE_CHART
  else:
    # When there are too many, comparing latest values is better
    # (than, say, breaking it into multiple timeline charts)
    chart_type = ChartType.BAR_CHART
  return add_chart_to_utterance(chart_type, state, chart_vars, places,
                                chart_origin)


def _fallback_cb(state: PopulateState, places: List[Place],
                 chart_origin: ChartOriginType) -> bool:
  # If NO SVs were found, then this is a OVERVIEW chart, added to a new block.
  state.block_id += 1
  chart_vars = ChartVars(svs=[],
                         block_id=state.block_id,
                         include_percapita=False)
  return add_chart_to_utterance(ChartType.PLACE_OVERVIEW, state, chart_vars,
                                places, chart_origin)
