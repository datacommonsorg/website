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

from server.lib.nl.common.utterance import ChartType
import server.lib.nl.common.utterance as nl_uttr
from server.lib.nl.fulfillment.types import ChartVars
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


# Gets the chart title for a list of entities, the property string,
# and direction of the property
def _get_title(entities, prop: str, out: bool) -> str:
  title_format_str = _OUT_TITLE if out else _IN_TITLE
  entity_str = ', '.join([e.name or e.dcid for e in entities])
  return title_format_str.format(property=prop, entity=entity_str)


# Gets the chart vars for a property and direction if values exist for that
# property and direction,
def _get_chart_vars(uttr: nl_uttr.Utterance, prop: str, out: bool) -> ChartVars:
  entity_dcids = [e.dcid for e in uttr.entities]
  prop_with_direction = f'{_OUT_ARROW}{prop}' if out else f'{_IN_ARROW}{prop}'
  prop_values = get_property_value_from_expression(entity_dcids, prop_with_direction)
  if not any(prop_values.values()):
    uttr.counters.err('triple_property_failed_existence', prop_with_direction)
    return None
  title = _get_title(uttr.entities, prop, out)
  chart_vars = ChartVars(props=[prop_with_direction], title=title)
  return chart_vars


# Handles properties with no direction specified
def _populate_any_direction_prop(uttr: nl_uttr.Utterance, prop: str):
  # TODO: prefer index to use properties with arrows
  out_chart_vars = _get_chart_vars(uttr, prop, True)
  in_chart_vars = _get_chart_vars(uttr, prop, False)
  chart_added = False
  state = PopulateState(uttr=uttr)
  for cv in [out_chart_vars, in_chart_vars]:
    if not cv:
      continue
    chart_added |= add_chart_to_utterance(ChartType.ANSWER,
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

  chart_added = False
  # TODO: consider messaging if top matches fail existence
  for prop in uttr.properties:
    # TODO: handle properties that are links that use ->
    if '->' in prop or '<-' in prop:
      uttr.counters.err('triple_property_unsupported', prop)
      continue
    else:
      if _populate_any_direction_prop(uttr, prop):
        chart_added = True
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
