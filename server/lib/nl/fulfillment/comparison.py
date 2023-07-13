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
from server.lib.nl.common.utterance import FulfillmentResult
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.base import add_chart_to_utterance
from server.lib.nl.fulfillment.base import populate_charts_for_places
from server.lib.nl.fulfillment.context import most_recent_places_from_context
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState


def populate(uttr: Utterance) -> bool:
  # NOTE: The COMPARISON attribute has no additional parameters.  So start
  # by directly inferring the list of places to compare.
  state = PopulateState(uttr=uttr, main_cb=_populate_cb)
  is_partial = False
  places_to_compare = []
  # Extend so we don't point to state.uttr.places and modify in-place.
  places_to_compare.extend(state.uttr.places)

  # If the current query has >1 place, we're good.  Otherwise look
  # in context...
  if len(places_to_compare) <= 1:
    is_partial = True
    for p in most_recent_places_from_context(uttr):
      # Avoid adding duplicates
      if not state.uttr.places or p.dcid != state.uttr.places[0].dcid:
        places_to_compare.append(p)

  dcids = [p.dcid for p in places_to_compare]
  uttr.counters.info('comparison_place_candidates', dcids)
  if len(places_to_compare) > 1:
    # No fallback when doing multiple places.
    if populate_charts_for_places(state,
                                  places_to_compare,
                                  disable_fallback=True):
      if is_partial:
        state.uttr.place_source = FulfillmentResult.PARTIAL_PAST_QUERY
      return True
    else:
      uttr.counters.err('comparison_failed_populate_places', dcids)
  else:
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
