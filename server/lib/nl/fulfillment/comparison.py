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
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.base import add_chart_to_utterance
from server.lib.nl.fulfillment.base import populate_charts_for_places
from server.lib.nl.fulfillment.context import \
    places_for_comparison_from_context
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState


def populate(uttr: Utterance) -> bool:
  # NOTE: The COMPARISON attribute has no additional parameters.  So start
  # by directly inferring the list of places to compare.
  state = PopulateState(uttr=uttr, main_cb=_populate_cb)
  place_comparison_candidates = places_for_comparison_from_context(uttr)
  for places_to_compare in place_comparison_candidates:
    dcids = [p.dcid for p in places_to_compare]
    uttr.counters.info('comparison_place_candidates', dcids)
    if populate_charts_for_places(state, places_to_compare):
      return True
    else:
      uttr.counters.err('comparison_failed_populate_places', dcids)
  if not place_comparison_candidates:
    uttr.counters.err('comparison_failed_to_find_multiple_places', 1)
  return False


def _populate_cb(state: PopulateState, chart_vars: ChartVars,
                 places: List[Place], chart_origin: ChartOriginType) -> bool:
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
