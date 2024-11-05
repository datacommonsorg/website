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

from server.lib.fetch import properties
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.config_builder.base import get_property_display_name
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
_OVERVIEW_TITLE = 'Here are all the properties for {entity}'
_MAX_ENTITIES_IN_TITLE = 3


# Gets the name for an entity
def _entity_name(entity: Entity) -> str:
  return entity.name or entity.dcid


# Gets a title string for a list of entities
def _get_entity_string(entities: List[Entity]) -> str:
  # Get the list of unique entity names
  seen_entity_names = set()
  unique_entity_names = []
  for e in entities:
    entity_name = _entity_name(e)
    entity_name_lowercase = entity_name.lower()
    if not entity_name_lowercase in seen_entity_names:
      unique_entity_names.append(entity_name)
      seen_entity_names.add(entity_name_lowercase)

  # if there is only 1 unique entity name, return it
  if len(unique_entity_names) == 1:
    return unique_entity_names[0]

  # otherwise, add commas and spaces to make the list of entities into a proper
  # string
  entity_str = ''
  max_entries = min(_MAX_ENTITIES_IN_TITLE, len(unique_entity_names))
  # Join together the first max_entries - 1 number of entities with a ', '
  entity_str = ', '.join(unique_entity_names[:max_entries - 1])
  if max_entries < len(unique_entity_names):
    # If not all entities are named in the title, get the number of unnamed
    # entities and add that to the title
    num_unnamed = len(unique_entity_names) - max_entries + 1
    entity_str += f' and {num_unnamed} more others'
  else:
    # Otherwise just add the last entity name to the title.
    entity_str += f' and {unique_entity_names[-1]}'
  return entity_str


# Gets the chart title for a list of entities and a property expression
# TODO: revisit how titles should be displayed
# TODO: move getting title to config_builder: https://github.com/datacommonsorg/website/blob/master/server/lib/nl/config_builder/base.py
def _get_title(entities: List[Entity], prop_expression: str) -> str:
  entity_str = _get_entity_string(entities)
  override_prop_titles = current_app.config['NL_PROP_TITLES']

  # If there is an override title format, return that as the title
  override_title_format = override_prop_titles.get(prop_expression,
                                                   {}).get('titleFormat', '')
  if override_title_format:
    return override_title_format.format(entity=entity_str)

  # build the title for each case
  prop_display_name = get_property_display_name(prop_expression)
  if len(entities) > 1:
    return _MULTI_ENTITY_TITLE.format(property=prop_display_name,
                                      entity=entity_str)
  elif prop_expression.startswith(_OUT_ARROW):
    return _OUT_TITLE.format(property=prop_display_name, entity=entity_str)
  elif prop_expression.startswith(_IN_ARROW):
    return _IN_TITLE.format(property=prop_display_name, entity=entity_str)
  return ''


# Adds chart for a property expression if values exist for that expression
def _populate_prop_expression(state: PopulateState,
                              prop_expression: str) -> bool:
  entity_dcids = [e.dcid for e in state.uttr.entities]
  prop_values = get_property_value_from_expression(entity_dcids,
                                                   prop_expression)
  entities_with_value = [
      e for e in state.uttr.entities if prop_values.get(e.dcid, [])
  ]
  if not entities_with_value:
    state.uttr.counters.err('triple_property_failed_existence', prop_expression)
    return False
  title = _get_title(entities_with_value, prop_expression)
  cv = ChartVars(props=[prop_expression], title=title)
  return add_chart_to_utterance(ChartType.ANSWER,
                                state,
                                cv, [],
                                entities=entities_with_value)


# The overview chart when there is more than 1 entity should be a table with
# all the out arcs of the entities.
def _add_multi_entity_overview(state: PopulateState) -> bool:
  entity_dcids = [e.dcid for e in state.uttr.entities]
  prop_set = set()
  for prop_list in properties(entity_dcids).values():
    prop_set.update(prop_list)
  prop_list = [f'{_OUT_ARROW}{prop}' for prop in sorted(list(prop_set))]
  chart_title = _OVERVIEW_TITLE.format(
      entity=_get_entity_string(state.uttr.entities))
  cv = ChartVars(props=prop_list, title=chart_title)
  return add_chart_to_utterance(ChartType.ANSWER,
                                state,
                                cv, [],
                                entities=state.uttr.entities)


def populate(state: PopulateState) -> bool:
  if not state.uttr.entities:
    state.uttr.counters.err('triple_failed_no_entities', 1)
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

  # Get the entities to show in the overview tile. This should be the entities
  # from previous charts that have been added, or if no charts were added, then
  # it is the detected entities
  chart_entities = set()
  for cspec in state.uttr.chartCandidates:
    chart_entities.update(e.dcid for e in cspec.entities)
  overview_entities = state.uttr.entities
  if chart_entities:
    overview_entities = [e for e in overview_entities if e.dcid in chart_entities]

  # If there is a single entity to show overview for, add an entity overview chart
  if len(overview_entities) == 1:
    chart_title = _OVERVIEW_TITLE.format(
        entity=_get_entity_string(overview_entities))
    chart_added |= add_chart_to_utterance(ChartType.ENTITY_OVERVIEW,
                                          state,
                                          ChartVars(title=chart_title), [],
                                          entities=overview_entities)
  elif not chart_added:
    # If there is more than 1 entity and no charts added yet, add an overview
    chart_added = _add_multi_entity_overview(state)

  return chart_added
