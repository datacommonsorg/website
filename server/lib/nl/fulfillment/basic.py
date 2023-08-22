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

from server.lib.explore import params
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import RankingType
from server.lib.nl.fulfillment import containedin
from server.lib.nl.fulfillment import ranking_across_places
from server.lib.nl.fulfillment import ranking_across_vars
from server.lib.nl.fulfillment import simple
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState

_EXPLORE_RANKING_COUNT = 5
_EXPLORE_SCHOOL_RANKING_COUNT = 10

# The the threshold of total #chart-vars at which we stop showing the whole SVPG.
_MAX_NUM_CHART_VARS_THRESHOLD = 3
_MAX_RANKING_AND_MAP_PER_SVPG_LOWER = 2
_MAX_RANKING_AND_MAP_PER_SVPG_UPPER = 10

#
# NOTE: basic is a layer on topic of simple, containedin, ranking_across_places and ranking_across_vars
# The choice of the charts to show depends on the `explore_mode`
#


def populate(state: PopulateState, chart_vars: ChartVars, places: List[Place],
             chart_origin: ChartOriginType) -> bool:
  if chart_vars.event:
    state.uttr.counters.err('basic_failed_cb_events', 1)
    return False
  if not chart_vars:
    state.uttr.counters.err('basic_failed_cb_missing_chat_vars', 1)
    return False
  if not chart_vars.svs:
    state.uttr.counters.err('basic_failed_cb_missing_svs', 1)
    return False
  if not places:
    state.uttr.counters.err('basic_failed_cb_noplace', places)
    return False
  if len(places) > 1:
    state.uttr.counters.err('basic_failed_cb_toomanyplaces', places)
    return False

  if state.explore_mode:
    return _populate_explore(state, chart_vars, places, chart_origin)
  else:
    return _populate_chat(state, chart_vars, places, chart_origin)


def _populate_explore(state: PopulateState, chart_vars: ChartVars,
                      places: List[Place],
                      chart_origin: ChartOriginType) -> bool:
  added = False

  # For peer-groups, add multi-line charts.
  if chart_vars.is_topic_peer_group:

    added |= simple.populate(state, chart_vars, places, chart_origin)

    # Limit the number of map/ranking charts in an SVPG.
    if len(state.exist_chart_vars_list) > _MAX_NUM_CHART_VARS_THRESHOLD:
      max_rank_and_map_charts = _MAX_RANKING_AND_MAP_PER_SVPG_LOWER
    else:
      max_rank_and_map_charts = _MAX_RANKING_AND_MAP_PER_SVPG_UPPER

  else:
    max_rank_and_map_charts = len(chart_vars.svs)

  is_sdg = params.is_sdg(state.uttr.insight_ctx)

  all_svs = copy.deepcopy(chart_vars.svs)
  for sv in all_svs[:max_rank_and_map_charts]:
    chart_vars.svs = [sv]
    if not chart_vars.is_topic_peer_group:
      added |= simple.populate(state, chart_vars, places, chart_origin)

    # If this is SDG, unless user has asked for ranking, do not return!
    if not is_sdg or state.ranking_types:
      ranking_orig = state.ranking_types
      state.ranking_types = [RankingType.HIGH, RankingType.LOW]
      added |= ranking_across_places.populate(
          state, chart_vars, places, chart_origin,
          _get_ranking_count_by_type(state.place_type))
      state.ranking_types = ranking_orig

  return added


def _populate_chat(state: PopulateState, chart_vars: ChartVars,
                   places: List[Place], chart_origin: ChartOriginType) -> bool:
  if state.ranking_types:
    # Ranking query
    if state.place_type:
      # This is ranking across places.
      if ranking_across_places.populate(state, chart_vars, places,
                                        chart_origin):
        return True
    else:
      # This is ranking across vars.
      if ranking_across_vars.populate(state, chart_vars, places, chart_origin):
        return True

  if state.place_type:
    if containedin.populate(state, chart_vars, places, chart_origin):
      return True

  return simple.populate(state, chart_vars, places, chart_origin)


def _get_ranking_count_by_type(t: ContainedInPlaceType):
  if t and t.value.endswith('School'):
    return _EXPLORE_SCHOOL_RANKING_COUNT
  return _EXPLORE_RANKING_COUNT
