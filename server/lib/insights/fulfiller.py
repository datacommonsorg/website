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
"""Module for NL page data spec"""

import logging
from typing import List

import server.lib.nl.common.utils as cutils
import server.lib.nl.common.utterance as nl_uttr
import server.lib.nl.detection.types as dtypes
from server.lib.nl.fulfillment.base import add_chart_to_utterance
import server.lib.nl.fulfillment.existence as ext
import server.lib.nl.fulfillment.types as ftypes

# Number of variables to plot in a chart (largely Timeline chart)
_MAX_VARS_PER_CHART = 5

_MAX_NUM_CHARTS = 20


#
# Populate chart candidates in the utterance.
#
def fulfill(uttr: nl_uttr.Utterance) -> nl_uttr.Utterance:
  # 1. Timeline chart for place
  # 2. If child-type:
  #    (a) Top-N for vars
  #    (b) Bottom-N for vars
  #    (c) Map
  # 3. For SVG, a comparison chart.

  # This is a useful thing to set since checks for
  # single-point or not happen downstream.
  uttr.query_type = nl_uttr.QueryType.SIMPLE
  pt = cutils.get_contained_in_type(uttr)
  state = ftypes.PopulateState(uttr=uttr, main_cb=None, place_type=pt)

  # Open up topics into vars and build ChartVars for each.
  chart_vars_map = {}
  for sv in state.uttr.svs:
    cv = ext.build_chart_vars(state, sv)
    chart_vars_map[sv] = cv
    logging.info(f'{sv} -> {cv}')

  # Get places to perform existence check on.
  places_to_check = _get_place_dcids(uttr.places)
  if state.place_type:
    # REQUIRES: len(places) == 1
    places_to_check.extend(
        cutils.get_sample_child_places(uttr.places[0].dcid,
                                       state.place_type.value,
                                       state.uttr.counters))
  if not places_to_check:
    uttr.counters.err("failed_NoPlacesToCheck", '')
    return

  # Perform existence checks for all the SVs!
  tracker = ext.MainExistenceCheckTracker(state, places_to_check, uttr.svs,
                                          chart_vars_map)
  tracker.perform_existence_check()

  existing_svs = set()
  num_charts = 0
  for exist_state in tracker.exist_sv_states:
    for exist_cv in exist_state.chart_vars_list:
      chart_vars = tracker.get_chart_vars(exist_cv)
      if chart_vars.svs:
        existing_svs.update(chart_vars.svs)
        num_charts += add_chart_vars(state, chart_vars)

      if num_charts > _MAX_NUM_CHARTS:
        break
    if num_charts > _MAX_NUM_CHARTS:
      break

  rank_charts(uttr)
  return uttr


def add_chart_vars(state: ftypes.PopulateState,
                   chart_vars: ftypes.ChartVars) -> int:

  # Add timeline and/or bar charts.
  if len(chart_vars.svs) <= _MAX_VARS_PER_CHART:
    # For fewer SVs, comparing trends over time is nicer.
    chart_type = nl_uttr.ChartType.TIMELINE_CHART
    chart_vars.response_type = "timeline"
  else:
    # When there are too many, comparing latest values is better
    # (than, say, breaking it into multiple timeline charts)
    chart_type = nl_uttr.ChartType.BAR_CHART
    chart_vars.response_type = "bar chart"
  if chart_type == nl_uttr.ChartType.TIMELINE_CHART:
    if chart_vars.has_single_point:
      # Demote to bar chart if single point.
      # TODO: eventually for single SV case, make it a highlight chart
      chart_type = nl_uttr.ChartType.BAR_CHART
      chart_vars.response_type = "bar chart"
      state.uttr.counters.info('simple_timeline_to_bar_demotions', 1)
  add_chart_to_utterance(chart_type, state, chart_vars, state.uttr.places)

  if not state.place_type:
    return 1

  # Add map charts.
  state.place_type = state.place_type
  add_chart_to_utterance(nl_uttr.ChartType.MAP_CHART, state, chart_vars,
                         state.uttr.places)

  # Add ranking charts.
  state.ranking_types = [dtypes.RankingType.HIGH]
  add_chart_to_utterance(nl_uttr.ChartType.RANKING_CHART, state, chart_vars,
                         state.uttr.places)
  state.ranking_types = [dtypes.RankingType.LOW]
  add_chart_to_utterance(nl_uttr.ChartType.RANKING_CHART, state, chart_vars,
                         state.uttr.places)

  return 4


#
# Rank candidate charts in the given Utterance.
#
# TODO: Maybe improve in future.
def rank_charts(utterance: nl_uttr.Utterance):
  utterance.rankedCharts = utterance.chartCandidates


def _get_place_dcids(places: List[dtypes.Place]) -> List[str]:
  dcids = []
  for p in places:
    dcids.append(p.dcid)
  return dcids
