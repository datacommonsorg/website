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
import logging
from typing import List

import server.lib.explore.existence as ext
from server.lib.nl.common import constants
from server.lib.nl.common import utils
from server.lib.nl.common.rank_utils import filter_and_rank_places
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import RankingType
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance


#
# For ranking across places, we should detect a ranking and contained-in
# classification in the current utterance.  For example, [counties with most rainfall],
# assuming california is in the context.
#
def populate(state: PopulateState,
             chart_vars: ChartVars,
             places: List[Place],
             chart_origin: ChartOriginType,
             rank: int,
             ranking_count: int = 0) -> bool:
  logging.info('populate_cb for ranking_across_places')
  if not state.ranking_types:
    state.uttr.counters.err('ranking-across-places_failed_cb_norankingtypes', 1)
    return False
  if len(places) > 1:
    state.uttr.counters.err('ranking-across-places_failed_cb_toomanyplaces',
                            [p.dcid for p in places])
    return False
  if not state.place_type:
    state.uttr.counters.err('ranking-across-places_failed_cb_noplacetype', 1)
    return False
  if not chart_vars.svs and not chart_vars.event:
    state.uttr.counters.err('ranking-across-places_failed_cb_emptyvars', {
        'svs': chart_vars.svs,
        'event': chart_vars.event,
    })
    return False

  if chart_vars.event:
    return add_chart_to_utterance(ChartType.EVENT_CHART, state, chart_vars,
                                  places, chart_origin)
  else:
    exist_svs = ext.svs4children(state, places[0], chart_vars.svs).exist_svs
    if not exist_svs:
      state.uttr.counters.err('ranking-across-places_failed_existence', 1)
      return False
    chart_vars.svs = exist_svs

    # Maybe set Answer Places.  Be very conservative here.
    # We only do this if this is the first chart, user requested ranking
    # result and this is for 1 SV.
    if (rank == 0 and len(chart_vars.svs) == 1 and
        len(state.ranking_types) == 1 and
        state.ranking_types[0] in [RankingType.HIGH, RankingType.LOW]):
      # Perform a read.
      ranked_places = filter_and_rank_places(places[0], state.place_type,
                                             chart_vars.svs[0])
      if state.ranking_types[0] == RankingType.LOW:
        # Reverse the order.
        ranked_places.reverse()
      ans_places = copy.deepcopy(ranked_places[:constants.MAX_ANSWER_PLACES])
      state.uttr.answerPlaces = ans_places
      state.uttr.counters.info('ranking-across-places_answer_places',
                               [p.dcid for p in ans_places])

    if not utils.has_map(state.place_type, places):
      chart_vars.skip_map_for_ranking = True
    return add_chart_to_utterance(ChartType.RANKING_WITH_MAP,
                                  state,
                                  chart_vars,
                                  places,
                                  chart_origin,
                                  ranking_count=ranking_count)
