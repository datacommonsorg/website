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
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance


def populate(state: PopulateState, chart_vars: ChartVars, places: List[Place],
             chart_origin: ChartOriginType) -> bool:
  dcids = [p.dcid for p in state.uttr.places]
  state.uttr.counters.info('comparison_place_candidates', dcids)

  logging.info('populate_cb for comparison')
  if len(places) < 2:
    state.uttr.counters.err('comparison_failed_cb_toofewplaces', 1)
    return False
  if chart_vars.event:
    state.uttr.counters.err('comparison_failed_cb_events', 1)
    return False

  if len(chart_vars.svs) == 1:
    sv = chart_vars.svs[0]
    exist_places = [
        p for p in places if ext.svs4place(state, p, [sv]).exist_svs
    ]
    # Main existence check
    if len(exist_places) <= 1:
      return False
    places = exist_places
  else:
    exist_svs = []
    for sv in chart_vars.svs:
      if all([bool(ext.svs4place(state, p, [sv]).exist_svs) for p in places]):
        exist_svs.append(sv)
    if not exist_svs:
      return False
    chart_vars.svs = exist_svs

  add_chart_to_utterance(ChartType.BAR_CHART, state, chart_vars, places,
                         chart_origin)
  return True
