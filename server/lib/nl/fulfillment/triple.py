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

from flask import current_app

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
_MULTI_ENTITY_TITLE = 'The {property} for {entity} are as follows:'
_MAX_ENTITIES_IN_TITLE = 3


# Gets the name for an entity
def _entity_name(entity: Entity) -> str:
  return entity.name or entity.dcid


# Gets a title string for a list of entities
def _get_entity_string(entities: List[Entity]) -> str:
  if len(entities) == 1:
    return _entity_name(entities[0])
  entity_str = ''
  max_entries = min(_MAX_ENTITIES_IN_TITLE, len(entities))
  # Join together the first max_entries - 1 number of entities with a ', '
  entity_str = ', '.join([_entity_name(e) for e in entities[:max_entries - 1]])
  if max_entries < len(entities):
    # If not all entities are named in the title, get the number of unnamed
    # entities and add that to the title
    num_unnamed = len(entities) - max_entries + 1
    entity_str += f' and {num_unnamed} more'
  else:
    # Otherwise just add the last entity name to the title.
    entity_str += f' and {_entity_name(entities[max_entries - 1])}'
  return entity_str


# Gets the chart title for a list of entities and a property expression
# TODO: revisit how titles should be displayed
# TODO: move getting title to config_builder: https://github.com/datacommonsorg/website/blob/master/server/lib/nl/config_builder/base.py
def _get_title(entities: List[Entity], prop_expression: str) -> str:
  entity_str = _get_entity_string(entities)
  override_prop_titles = current_app.config['NL_PROP_TITLES']
  override_title_format = override_prop_titles.get(prop_expression,
                                                   {}).get('titleFormat', '')
  if override_title_format:
    return override_title_format.format(entity=entity_str)
  elif len(entities) > 1:
    prop_display_name = prop_expression[len(_OUT_ARROW):]
    return _MULTI_ENTITY_TITLE.format(property=prop_display_name,
                                      entity=entity_str)
  elif prop_expression.startswith(_OUT_ARROW):
    prop_display_name = prop_expression[len(_OUT_ARROW):]
    return _OUT_TITLE.format(property=prop_display_name, entity=entity_str)
  elif prop_expression.startswith(_IN_ARROW):
    prop_display_name = prop_expression[len(_IN_ARROW):]
    return _IN_TITLE.format(property=prop_display_name, entity=entity_str)
  return ''


# Adds chart for a property expression if values exist for that expression
def _populate_prop_expression(state: PopulateState,
                              prop_expression: str) -> bool:
  entity_dcids = [e.dcid for e in state.uttr.entities]
  prop_values = get_property_value_from_expression(entity_dcids,
                                                   prop_expression)
  if not any(prop_values.values()):
    state.uttr.counters.err('triple_property_failed_existence', prop_expression)
    return False
  title = _get_title(state.uttr.entities, prop_expression)
  cv = ChartVars(props=[prop_expression], title=title)
  return add_chart_to_utterance(ChartType.ANSWER,
                                state,
                                cv, [],
                                entities=state.uttr.entities)


def populate(state: PopulateState) -> bool:
  if not state.uttr.entities:
    state.uttr.counters.err('triple_failed_no_entities', 1)
    return False
  if not state.uttr.properties:
    state.uttr.counters.err('triple_failed_no_properties', 1)
    return False

  chart_added = False
  # TODO: consider messaging if top matches fail existence
  for prop in state.uttr.properties:
    if _OUT_ARROW in prop or _IN_ARROW in prop:
      chart_added |= _populate_prop_expression(state, prop)
    else:
      for direction_arrow in [_OUT_ARROW, _IN_ARROW]:
        chart_added |= _populate_prop_expression(state, direction_arrow + prop)
    if chart_added:
      # Currently only handling one prop, so if populate succeeds for any one
      # prop, return.
      # TODO: revisit how we want to handle multiple props
      break
  # If we are populating for a single entity and we've added an answer for this
  # entity, also add an entity overview chart
  # TODO: consider if we want to always add an entity overview chart when there
  # are entities
  if chart_added and len(state.uttr.entities) == 1:
    add_chart_to_utterance(ChartType.ENTITY_OVERVIEW,
                           state,
                           ChartVars(), [],
                           entities=state.uttr.entities)
  return chart_added
