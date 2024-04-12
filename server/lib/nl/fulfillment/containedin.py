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

import server.lib.explore.existence as ext
from server.lib.nl.common import utils
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance


def populate(state: PopulateState, chart_vars: ChartVars,
             contained_places: List[Place], chart_origin: ChartOriginType,
             _: int) -> bool:
  if chart_vars.event:
    state.uttr.counters.err('containedin_failed_cb_events', 1)
    return False
  if not state.place_type:
    state.uttr.counters.err('containedin_failed_cb_missing_type', 1)
    return False
  if len(contained_places) > 1:
    state.uttr.counters.err('containedin_failed_cb_toomanyplaces',
                            contained_places)
    return False
  if not utils.has_map(state.place_type, contained_places[0]):
    state.uttr.counters.err('containedin_failed_cb_nonmap_type',
                            state.place_type)
    return False
  if not chart_vars:
    state.uttr.counters.err('containedin_failed_cb_missing_chat_vars', 1)
    return False
  if not chart_vars.svs:
    state.uttr.counters.err('containedin_failed_cb_missing_svs', 1)
    return False
  chart_vars = copy.deepcopy(chart_vars)

  exist_svs = ext.svs4children(state, contained_places[0],
                               chart_vars.svs).exist_svs
  if not exist_svs:
    state.uttr.counters.err('containedin_failed_existence', 1)
    return False
  chart_vars.svs = exist_svs

  sv_place_latest_date = ext.get_sv_place_latest_date(exist_svs,
                                                      contained_places,
                                                      state.place_type,
                                                      state.exist_checks)
  add_chart_to_utterance(ChartType.MAP_CHART,
                         state,
                         chart_vars,
                         contained_places,
                         chart_origin,
                         sv_place_latest_date=sv_place_latest_date)
  return True
