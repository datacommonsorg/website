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

from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance

# A simple fulfiller to add a PLACE_OVERVIEW chart by finding places in context.


def populate(uttr: Utterance) -> bool:
  if uttr.places:
    _add_place_overview(uttr.places[0], uttr)
    return True
  uttr.counters.err('overview_failed_noplaces', 1)
  return False


def _add_place_overview(place: Place, uttr: Utterance):
  state = PopulateState(uttr=uttr)
  chart_vars = ChartVars(svs=[])
  return add_chart_to_utterance(ChartType.PLACE_OVERVIEW, state, chart_vars,
                                [place], ChartOriginType.PRIMARY_CHART)
