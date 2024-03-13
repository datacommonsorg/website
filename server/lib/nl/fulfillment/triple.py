# Copyright 2024 Google LLC
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

from server.lib.fetch import raw_property_values
from server.lib.nl.common.utterance import ChartType
import server.lib.nl.common.utterance as nl_uttr
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance

#
# Handler for TRIPLE queries.
#


def populate(uttr: nl_uttr.Utterance) -> bool:
  if not uttr.entities:
    uttr.counters.err('triple_failed_no_entities', 1)
    return False
  if not uttr.properties:
    uttr.counters.err('triple_failed_no_properties', 1)
    return False

  for prop in uttr.properties:
    # TODO: handle properties that are links that use ->
    if '->' in prop or '<-' in prop:
      uttr.counters.err('triple_property_unsupported', prop)
      continue
    entity_dcids = [e.dcid for e in uttr.entities]
    prop_values = raw_property_values(entity_dcids, prop)
    if not any(prop_values.values()):
      uttr.counters.err('triple_property_failed_existence', prop)
      continue
    state = PopulateState(uttr=uttr)
    chart_vars = ChartVars(props=[prop])
    return add_chart_to_utterance(ChartType.ANSWER_WITH_ENTITY_OVERVIEW,
                                  state,
                                  chart_vars, [],
                                  entities=uttr.entities)
  return False
