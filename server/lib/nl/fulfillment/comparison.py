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
  chart_vars.response_type = "comparison chart"
  chart_vars.include_percapita = True
  add_chart_to_utterance(ChartType.BAR_CHART, state, chart_vars, places,
                         chart_origin)
  return True
