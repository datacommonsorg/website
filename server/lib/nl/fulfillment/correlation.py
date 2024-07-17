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
import time
from typing import List

import server.lib.nl.common.existence_util as exist
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import RankingType
from server.lib.nl.fulfillment import place_vars
from server.lib.nl.fulfillment import ranking_across_places
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance
from server.lib.nl.fulfillment.utils import is_coplottable


#
# Handler for correlation charts.
#
def populate(state: PopulateState, chart_vars: ChartVars, places: List[Place],
             chart_origin: ChartOriginType, rank: int) -> bool:
  # Correlation handling only works for 2 SVs, and with places.
  if len(chart_vars.svs) != 2 or not places:
    state.uttr.counters.err('correlation_failed_noplaceorsv', 1)
    return False

  # If there is a child-type and existence passes, we'll try to plot a SCATTER chart.
  if (state.place_type and
      len(exist.svs4children(state, places[0], chart_vars.svs).exist_svs) == 2):
    # Child existence check for both SVs.
    return _scatter(state, chart_vars, places, chart_origin, rank)

  # Otherwise, we'll try to plot simple charts, also pending existence check.
  elif len(exist.svs4place(state, places[0], chart_vars.svs).exist_svs) == 2:
    return _simple(state, chart_vars, places, chart_origin, rank)

  state.uttr.counters.err('correlation_existence_failed', 1)
  return False


def _scatter(state: PopulateState, chart_vars: ChartVars, places: List[Place],
             chart_origin: ChartOriginType, rank: int) -> bool:

  sv_place_latest_date = exist.get_sv_place_latest_date(chart_vars.svs, places,
                                                        state.place_type,
                                                        state.exist_checks)
  found = add_chart_to_utterance(ChartType.SCATTER_CHART,
                                 state,
                                 chart_vars,
                                 places,
                                 chart_origin,
                                 sv_place_latest_date=sv_place_latest_date)
  if found:
    ranking_orig = state.ranking_types
    state.ranking_types = [RankingType.HIGH, RankingType.LOW]
    found |= ranking_across_places.populate(state,
                                            chart_vars,
                                            places,
                                            chart_origin,
                                            rank,
                                            ranking_count=5)
    state.ranking_types = ranking_orig

  return found


def _simple(state: PopulateState, chart_vars: ChartVars, places: List[Place],
            chart_origin: ChartOriginType, rank: int) -> bool:
  if not is_coplottable(chart_vars.svs, places, state.exist_checks):
    # TODO: This should eventually be a User Message
    state.uttr.counters.err('correlation_coplottable_failed', chart_vars.svs)
    return False

  cv = copy.deepcopy(chart_vars)
  # Set this so that `simple` will plot the SVs in a single chart.
  cv.is_topic_peer_group = True

  return place_vars.populate(state, cv, places, chart_origin, rank)
