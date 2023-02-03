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

from lib.nl import utils
from lib.nl.detection import Place
from lib.nl.fulfillment.base import add_chart_to_utterance
from lib.nl.fulfillment.base import ChartVars
from lib.nl.fulfillment.base import populate_charts
from lib.nl.fulfillment.base import PopulateState
from lib.nl.utterance import ChartOriginType
from lib.nl.utterance import ChartType
from lib.nl.utterance import Utterance

# Number of variables to plot in a chart (largely Timeline chart)
_MAX_VARS_PER_CHART = 5

OVERVIEW_TEXT = "{place} is a {place_type} in {parent_place}. It has a population of {population} in {population_year}. Here is more information about {place}."
TIMELINE_TEXT = "Here is some information about {svs} and more in {place_name}."


def populate(uttr: Utterance) -> bool:
  return populate_charts(
      PopulateState(uttr=uttr, main_cb=_populate_cb, fallback_cb=_fallback_cb))


def _populate_cb(state: PopulateState, chart_vars: ChartVars,
                 places: List[Place], chart_origin: ChartOriginType) -> bool:
  logging.info('populate_cb for simple')
  description = TIMELINE_TEXT.format(place_name = ", ".join([p.name for p in places]),
    svs = ", ".join(chart_vars.svs))
  if len(chart_vars.svs) <= _MAX_VARS_PER_CHART:
    # For fewer SVs, comparing trends over time is nicer.
    chart_type = ChartType.TIMELINE_CHART
  else:
    # When there are too many, comparing latest values is better
    # (than, say, breaking it into multiple timeline charts)
    chart_type = ChartType.BAR_CHART
  if chart_type == ChartType.TIMELINE_CHART:
    if utils.has_series_with_single_datapoint(places[0].dcid, chart_vars.svs):
      # Demote to bar chart if single point.
      # TODO: eventually for single SV case, make it a highlight chart
      chart_type = ChartType.BAR_CHART
  return add_chart_to_utterance(chart_type, state, chart_vars, places,
                                chart_origin, "some charts")


def _fallback_cb(state: PopulateState, places: List[Place],
                 chart_origin: ChartOriginType) -> bool:
  # If NO SVs were found, then this is a OVERVIEW chart, added to a new block.
  state.block_id += 1
  chart_vars = ChartVars(svs=[],
                         block_id=state.block_id,
                         include_percapita=False)
  return add_chart_to_utterance(ChartType.PLACE_OVERVIEW, state, chart_vars,
                                places, chart_origin)
