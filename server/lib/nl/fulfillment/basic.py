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

from server.lib.nl.common.constants import PROJECTED_TEMP_TOPIC
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import RankingType
from server.lib.nl.explore import params
from server.lib.nl.fulfillment import containedin
from server.lib.nl.fulfillment import place_vars
from server.lib.nl.fulfillment import ranking_across_places
from server.lib.nl.fulfillment import ranking_across_vars
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState

_EXPLORE_RANKING_COUNT = 5
_EXPLORE_SCHOOL_RANKING_COUNT = 10

# The the threshold of total #chart-vars at which we stop showing the whole SVPG.
_MAX_NUM_CHART_VARS_THRESHOLD = 3
_MAX_RANKING_AND_MAP_PER_SVPG_LOWER = 2
_MAX_RANKING_AND_MAP_PER_SVPG_UPPER = 10

# Num charts for considering place-type fallback
_PLACE_TYPE_FALLBACK_THRESHOLD_RANK = 5

#
# NOTE: basic is a wrapper around place_vars, containedin, ranking_across_places and ranking_across_vars
#


def populate(state: PopulateState, chart_vars: ChartVars, places: List[Place],
             chart_origin: ChartOriginType, rank: int) -> bool:
  if not chart_vars:
    state.uttr.counters.err('basic_failed_cb_missing_chart_vars', 1)
    return False
  if chart_vars.event:
    state.uttr.counters.err('basic_failed_cb_events', 1)
    return False
  if not chart_vars.svs:
    state.uttr.counters.err('basic_failed_cb_missing_svs', 1)
    return False
  if not places:
    state.uttr.counters.err('basic_failed_cb_noplace', '')
    return False
  if len(places) > 1:
    state.uttr.counters.err('basic_failed_cb_toomanyplaces',
                            [p.dcid for p in places])
    return False

  if (chart_vars.source_topic == PROJECTED_TEMP_TOPIC or
      params.is_toolformer_mode(state.uttr.mode)):
    # PROJECTED_TEMP_TOPIC has some very custom handling in config-builder,
    # that needs to be deprecated.
    # TODO: Deprecate this flow completely!
    #
    # For toolformer mode, where we return focussed charts based
    # on query, additional charts are not very useful.
    return _populate_specific(state=state,
                              chart_vars=chart_vars,
                              places=places,
                              chart_origin=chart_origin,
                              rank=rank)
  else:
    return _populate_explore(state, chart_vars, places, chart_origin, rank)


def _populate_explore(state: PopulateState, chart_vars: ChartVars,
                      places: List[Place], chart_origin: ChartOriginType,
                      rank: int) -> bool:
  added = False

  # For peer-groups, add multi-line charts.
  max_rank_and_map_charts = _get_max_rank_and_map_charts(chart_vars, state)
  is_special_dc = params.is_special_dc(state.uttr.insight_ctx)

  # If user specified an explicit child place type, show child charts
  # (map, ranking) before main (bars, timelines).
  user_set_child_type = False
  if state.place_type and not state.had_default_place_type:
    user_set_child_type = True

  # If user didn't ask for ranking, show timeline+highlight first.
  if not user_set_child_type and chart_vars.is_topic_peer_group:
    added |= place_vars.populate(state, chart_vars, places, chart_origin, rank)

  cv = copy.deepcopy(chart_vars)
  for sv in chart_vars.svs[:max_rank_and_map_charts]:
    cv.svs = [sv]

    # If user didn't ask for ranking, show timeline+highlight first.
    if not user_set_child_type and not cv.is_topic_peer_group:
      added |= place_vars.populate(state, cv, places, chart_origin, rank)

    if state.place_type:
      # If this is SDG, unless user has asked for ranking, do not return!
      added_child_type_charts = False
      if not is_special_dc or state.ranking_types:
        ranking_orig = state.ranking_types
        if not state.ranking_types:
          state.ranking_types = [RankingType.HIGH, RankingType.LOW]
        added_child_type_charts = ranking_across_places.populate(
            state,
            cv,
            places,
            chart_origin,
            rank,
            ranking_count=_get_ranking_count_by_type(state.place_type,
                                                     ranking_orig))
        state.ranking_types = ranking_orig
      elif is_special_dc:
        # Return only map.
        added_child_type_charts = containedin.populate(state, cv, places,
                                                       chart_origin, rank)

      if added_child_type_charts:
        _maybe_set_place_type_existence(state, rank)
      added |= added_child_type_charts

    # If user had asked for ranking, show timeline+highlight last.
    if user_set_child_type and not cv.is_topic_peer_group:
      added |= place_vars.populate(state, cv, places, chart_origin, rank)

  # If user had asked for ranking, show timeline+highlight last.
  if user_set_child_type and chart_vars.is_topic_peer_group:
    added |= place_vars.populate(state, chart_vars, places, chart_origin, rank)

  return added


def _populate_specific(state: PopulateState, chart_vars: ChartVars,
                       places: List[Place], chart_origin: ChartOriginType,
                       rank: int) -> bool:
  user_set_child_type = bool(state.place_type and
                             not state.had_default_place_type)
  if state.ranking_types:
    # Ranking query
    if user_set_child_type:
      # This is ranking across places.
      if ranking_across_places.populate(state, chart_vars, places, chart_origin,
                                        rank):
        _maybe_set_place_type_existence(state, rank)
        return True
    else:
      # This is ranking across vars.
      if ranking_across_vars.populate(state, chart_vars, places, chart_origin,
                                      rank):
        return True

  if user_set_child_type:
    if containedin.populate(state, chart_vars, places, chart_origin, rank):
      _maybe_set_place_type_existence(state, rank)
      return True

  return place_vars.populate(state, chart_vars, places, chart_origin, rank)


def _maybe_set_place_type_existence(state: PopulateState, rank: int):
  if (state.place_type and not state.had_default_place_type and
      rank < _PLACE_TYPE_FALLBACK_THRESHOLD_RANK):
    state.has_child_type_in_top_basic_charts = True


def _get_ranking_count_by_type(t: ContainedInPlaceType, rt: List[RankingType]):
  if (t and t.value.endswith('School')) or (len(rt) == 1):
    return _EXPLORE_SCHOOL_RANKING_COUNT
  return _EXPLORE_RANKING_COUNT


def _get_max_rank_and_map_charts(chart_vars: ChartVars,
                                 state: PopulateState) -> int:
  if chart_vars.is_topic_peer_group:
    # Limit the number of map/ranking charts in an SVPG.
    if len(state.exist_chart_vars_list) > _MAX_NUM_CHART_VARS_THRESHOLD:
      max_rank_and_map_charts = _MAX_RANKING_AND_MAP_PER_SVPG_LOWER
    else:
      max_rank_and_map_charts = _MAX_RANKING_AND_MAP_PER_SVPG_UPPER
  else:
    max_rank_and_map_charts = len(chart_vars.svs)
  return max_rank_and_map_charts
