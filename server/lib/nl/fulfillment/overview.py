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

from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.base import add_chart_to_utterance
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.utterance import ChartOriginType
from server.lib.nl.utterance import ChartType
from server.lib.nl.utterance import Utterance

# A simple fulfiller to add a PLACE_OVERVIEW chart by finding places in context.


def populate(uttr: Utterance) -> bool:
  if uttr.places:
    _add_place_overview(uttr.places[0], uttr)
    return True
  uttr.counters.err('overview_failed_noplaces', 1)
  return False


def _add_place_overview(place: Place, uttr: Utterance):
  state = PopulateState(uttr=uttr, main_cb=None)
  state.block_id += 1
  chart_vars = ChartVars(svs=[],
                         block_id=state.block_id,
                         include_percapita=False)
  return add_chart_to_utterance(ChartType.PLACE_OVERVIEW, state, chart_vars,
                                [place], ChartOriginType.PRIMARY_CHART)
