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

from typing import List

from server.lib.fetch import raw_property_values
from server.lib.nl.common.utterance import ChartType
import server.lib.nl.common.utterance as nl_uttr
from server.lib.nl.detection.types import Entity
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance

#
# Handler for TRIPLE queries.
#

_OUT_ARROW = '->'
_IN_ARROW = '<-'


# Gets the chart vars for a property and direction if values exist for that
# property and direction,
def _get_chart_vars(uttr: nl_uttr.Utterance, prop: str, out: bool) -> ChartVars:
  entity_dcids = [e.dcid for e in uttr.entities]
  prop_values = raw_property_values(entity_dcids, prop, out)
  if not any(prop_values.values()):
    return None
  prop_with_direction = f'{_OUT_ARROW}{prop}' if out else f'{_IN_ARROW}{prop}'
  chart_vars = ChartVars(props=[prop_with_direction])
  return chart_vars


# Handles properties with no direction specified
def _populate_any_direction_prop(uttr: nl_uttr.Utterance, prop: str):
  out_chart_vars = _get_chart_vars(uttr, prop, True)
  in_chart_vars = _get_chart_vars(uttr, prop, False)
  chart_added = False
  state = PopulateState(uttr=uttr)
  # Skip the entity overview in the first chartspec if we got chart vars
  # for both the in and out direction
  skip_first_overview = out_chart_vars and in_chart_vars
  for i, cv in enumerate([out_chart_vars, in_chart_vars]):
    if not cv:
      continue
    if i == 0:
      cv.skip_overview_for_entity_answer = skip_first_overview
    chart_added |= add_chart_to_utterance(ChartType.ANSWER_WITH_ENTITY_OVERVIEW,
                                          state,
                                          cv, [],
                                          entities=uttr.entities)
  return chart_added


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
    else:
      if _populate_any_direction_prop(uttr, prop):
        # Currently only handling one prop, so if populate succeeds for any one
        # prop, return.
        return True
      else:
        uttr.counters.err('triple_property_failed_existence', prop)
  return False
