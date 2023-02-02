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

from lib.nl.detection import Place
from lib.nl.fulfillment.base import add_chart_to_utterance
from lib.nl.fulfillment.base import ChartVars
from lib.nl.fulfillment.base import overview_fallback
from lib.nl.fulfillment.base import populate_charts_for_places
from lib.nl.fulfillment.base import PopulateState
from lib.nl.fulfillment.context import places_for_comparison_from_context
from lib.nl.utterance import ChartOriginType
from lib.nl.utterance import ChartType
from lib.nl.utterance import Utterance


def populate(uttr: Utterance) -> bool:
  # NOTE: The COMPARISON attribute has no additional parameters.  So start
  # by directly inferring the list of places to compare.
  state = PopulateState(uttr=uttr,
                        main_cb=_populate_cb,
                        fallback_cb=overview_fallback)
  for places_to_compare in places_for_comparison_from_context(uttr):
    if populate_charts_for_places(state, places_to_compare):
      return True
  return False


def _populate_cb(state: PopulateState, chart_vars: ChartVars,
                 places: List[Place], chart_origin: ChartOriginType) -> bool:
  logging.info('populate_cb for comparison')
  if len(places) < 2:
    return False
  add_chart_to_utterance(ChartType.BAR_CHART, state, chart_vars, places,
                         chart_origin)
  return True
