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
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance


#
# For ranking across places, we should detect a ranking and contained-in
# classification in the current utterance.  For example, [counties with most rainfall],
# assuming california is in the context.
#
def populate(state: PopulateState, chart_vars: ChartVars, places: List[Place],
             chart_origin: ChartOriginType) -> bool:
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
    chart_vars.response_type = "event chart"
    return add_chart_to_utterance(ChartType.EVENT_CHART, state, chart_vars,
                                  places, chart_origin)
  else:
    exist_svs = ext.svs4children(state, places[0], chart_vars.svs).exist_svs
    if not exist_svs:
      state.uttr.counters.err('containedin_failed_existence', 1)
      return False
    chart_vars.svs = exist_svs

    chart_vars.response_type = "ranking table"
    if not utils.has_map(state.place_type, places):
      chart_vars.skip_map_for_ranking = True
    chart_vars.include_percapita = True
    return add_chart_to_utterance(ChartType.RANKING_CHART, state, chart_vars,
                                  places, chart_origin)
