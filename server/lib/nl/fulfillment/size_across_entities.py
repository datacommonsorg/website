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
from server.lib.nl.common import utils
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import RankingType
from server.lib.nl.detection.types import SizeType
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance

# TODO: Add area
_PLACE_SIZE_VARS = [
    'Count_Person', 'Count_Household',
    'Amount_EconomicActivity_GrossDomesticProduction_RealValue',
    'Amount_EconomicActivity_GrossDomesticProduction_Nominal'
]

_SCHOOL_SIZE_VARS = [
    'Count_Student',
    'Count_Teacher',
    'Percent_Student_AsAFractionOf_Count_Teacher',
]

_SCHOOL_TYPES = frozenset([
    ContainedInPlaceType.SCHOOL,
    ContainedInPlaceType.ELEMENTARY_SCHOOL,
    ContainedInPlaceType.MIDDLE_SCHOOL,
    ContainedInPlaceType.HIGH_SCHOOL,
    ContainedInPlaceType.PRIMARY_SCHOOL,
    ContainedInPlaceType.PRIVATE_SCHOOL,
    ContainedInPlaceType.PUBLIC_SCHOOL,
])


def _get_vars(pt: ContainedInPlaceType):
  if pt in _SCHOOL_TYPES:
    return _SCHOOL_SIZE_VARS
  return _PLACE_SIZE_VARS


#
# For big/small entities in a parent entity (big schools in sunnyvale),
# we infer the SVs from the contained-in entity-type and then rely on BIG/SMALL
# to infer the ranking.
# TODO: This needs a custom override.
#
def set_overrides(state: PopulateState) -> bool:
  place_type = utils.get_contained_in_type(state.uttr)
  size_types = utils.get_size_types(state.uttr)
  if not place_type or not size_types:
    state.uttr.counters.err('size-across-entities_failed_noplaceorsizetype',
                            '-')
    return False

  #
  # Only if there are no SVs detected, do we consider SIZE_TYPE classification.
  #
  # BUT NOTE: The is_non_geo_place_type check is there for non-geo places
  # like schools which are not removed as stop-words for SV query.
  # For example, [how big are high schools] query, since we pass in
  # "high schools", they will indeed often match SVs.  So we let the
  # `SIZE_TYPE` heuristic override.
  # TODO: Find a better approach
  #
  if not utils.is_non_geo_place_type(place_type) and state.uttr.svs:
    state.uttr.counters.err('size-across-entities_failed_foundvars',
                            state.uttr.svs)
    return False

  state.uttr.svs = _get_vars(place_type)

  # Map size_types[0] to ranking_types.
  size_type = size_types[0]
  if size_type == SizeType.BIG:
    ranking_type = RankingType.HIGH
  else:
    ranking_type = RankingType.LOW

  state.ranking_types = [ranking_type]
  return True


def populate(state: PopulateState, chart_vars: ChartVars, places: List[Place],
             chart_origin: ChartOriginType, _: int) -> bool:
  logging.info('populate_cb for size_across_entities')
  if not state.ranking_types:
    state.uttr.counters.err('size-across-entities_failed_cb_norankingtypes', 1)
    return False
  if len(places) > 1:
    state.uttr.counters.err('size-across-entities_failed_cb_toomanyplaces',
                            [p.dcid for p in places])
    return False
  if not state.place_type:
    state.uttr.counters.err('size-across-entities_failed_cb_noplacetype', 1)
    return False
  if not chart_vars.svs:
    state.uttr.counters.err('size-across-entities_failed_cb_emptyvars',
                            chart_vars.svs)
    return False

  exist_svs = ext.svs4children(state, places[0], chart_vars.svs).exist_svs
  if not exist_svs:
    state.uttr.counters.err('containedin_failed_existence', 1)
    return False
  chart_vars.svs = exist_svs

  # No map chart for these.
  chart_vars.skip_map_for_ranking = True
  # We want all the ranking tables lined up in a single block.
  return add_chart_to_utterance(ChartType.RANKING_WITH_MAP, state, chart_vars,
                                places, chart_origin)
