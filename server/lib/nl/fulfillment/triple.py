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

from server.lib.nl.common.constants import OUT_PROP_DISPLAY_NAME
from server.lib.nl.common.utterance import ChartType
import server.lib.nl.common.utterance as nl_uttr
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import Entity
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance
from server.routes.shared_api.node import get_property_value_from_expression

#
# Handler for TRIPLE queries.
#

_OUT_ARROW = '->'
_IN_ARROW = '<-'
_OUT_TITLE = 'The {property} for {entity} is:'
_IN_TITLE = '{entity} is the {property} for:'


# Gets the chart title for a list of entities and a property expression
# TODO: revisit how titles should be displayed
def _get_title(entities: List[Entity], prop_expression: str) -> str:
  entity_str = ', '.join([e.name or e.dcid for e in entities])
  if prop_expression in OUT_PROP_DISPLAY_NAME or prop_expression.startswith(
      _OUT_ARROW):
    prop_display_name = OUT_PROP_DISPLAY_NAME.get(
        prop_expression, prop_expression[len(_OUT_ARROW):])
    title_format_str = _OUT_TITLE
  else:
    prop_display_name = prop_expression[len(_IN_ARROW):]
    title_format_str = _IN_TITLE
  return title_format_str.format(property=prop_display_name, entity=entity_str)


# Adds chart for a property expression if values exist for that expression
def _populate_prop_expression(uttr: nl_uttr.Utterance,
                              prop_expression: str) -> bool:
  entity_dcids = [e.dcid for e in uttr.entities]
  prop_values = get_property_value_from_expression(entity_dcids,
                                                   prop_expression)
  if not any(prop_values.values()):
    uttr.counters.err('triple_property_failed_existence', prop_expression)
    return False
  title = _get_title(uttr.entities, prop_expression)
  cv = ChartVars(props=[prop_expression], title=title)
  state = PopulateState(uttr=uttr)
  return add_chart_to_utterance(ChartType.ANSWER,
                                state,
                                cv, [],
                                entities=uttr.entities)


def populate(uttr: nl_uttr.Utterance) -> bool:
  if not uttr.entities:
    uttr.counters.err('triple_failed_no_entities', 1)
    return False
  if not uttr.properties:
    uttr.counters.err('triple_failed_no_properties', 1)
    return False

  chart_added = False
  # TODO: consider messaging if top matches fail existence
  for prop in uttr.properties:
    if '->' in prop or '<-' in prop:
      chart_added |= _populate_prop_expression(uttr, prop)
    else:
      for direction_arrow in [_OUT_ARROW, _IN_ARROW]:
        chart_added |= _populate_prop_expression(uttr, direction_arrow + prop)
    if chart_added:
      # Currently only handling one prop, so if populate succeeds for any one
      # prop, return.
      # TODO: revisit how we want to handle multiple props
      break
  # If we are populating for a single entity and we've added an answer for this
  # entity, also add an entity overview chart
  # TODO: consider if we want to always add an entity overview chart when there
  # are entities
  if chart_added and len(uttr.entities) == 1:
    add_chart_to_utterance(ChartType.ENTITY_OVERVIEW,
                           PopulateState(uttr=uttr),
                           ChartVars(), [],
                           entities=uttr.entities)
  return chart_added
