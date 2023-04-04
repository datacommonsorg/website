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

from server.lib.nl import utils
from server.lib.nl.detection import ClassificationType
from server.lib.nl.detection import ContainedInClassificationAttributes
from server.lib.nl.detection import Place
from server.lib.nl.fulfillment.base import add_chart_to_utterance
from server.lib.nl.fulfillment.base import ChartVars
from server.lib.nl.fulfillment.base import get_default_contained_in_place
from server.lib.nl.fulfillment.base import handle_contained_in_type
from server.lib.nl.fulfillment.base import open_top_topics_ordered
from server.lib.nl.fulfillment.base import PopulateState
from server.lib.nl.fulfillment.context import \
    classifications_of_type_from_context
from server.lib.nl.fulfillment.context import places_from_context
from server.lib.nl.fulfillment.context import svs_from_context
from server.lib.nl.utterance import ChartOriginType
from server.lib.nl.utterance import ChartType
from server.lib.nl.utterance import Utterance

_MAX_CONTEXT_SVS = 3
_MAX_MAIN_SVS = 5

#
# Handler for CORRELATION chart.  This does not use the populate_charts() logic
# because it is sufficiently different, requiring identifying pairs of SVs.
#


def populate(uttr: Utterance) -> bool:
  # Get the list of CONTAINED_IN classifications in order from current to past.
  classifications = classifications_of_type_from_context(
      uttr, ClassificationType.CONTAINED_IN)
  logging.info(classifications)
  for classification in classifications:
    if (not classification or not isinstance(
        classification.attributes, ContainedInClassificationAttributes)):
      continue
    place_type = classification.attributes.contained_in_place_type
    if _populate_correlation_for_place_type(
        PopulateState(uttr=uttr, main_cb=None, place_type=place_type)):
      return True
    else:
      uttr.counters.err('correlation_failed_populate_placestype',
                        place_type.value)
  return False


def _populate_correlation_for_place_type(state: PopulateState) -> bool:
  for pl in state.uttr.places:
    if (_populate_correlation_for_place(state, pl)):
      return True
    else:
      state.uttr.counters.err('correlation_failed_populate_main_place', pl.dcid)
  for pl in places_from_context(state.uttr):
    if (_populate_correlation_for_place(state, pl)):
      return True
    else:
      state.uttr.counters.err('correlation_failed_populate_context_place',
                              pl.dcid)

  default_place = get_default_contained_in_place(state)
  if default_place:
    return _populate_correlation_for_place(state, default_place)

  return False


def _populate_correlation_for_place(state: PopulateState, place: Place) -> bool:
  if not handle_contained_in_type(state, [place]):
    # counter updated in handle_contained_in_type
    return False

  # Get child place samples for existence check.
  places_to_check = utils.get_sample_child_places(place.dcid,
                                                  state.place_type.value,
                                                  state.uttr.counters)
  if not places_to_check:
    # Counter updated in get_sample_child_places
    return False

  # For the main SV of correlation, we expect a variable to
  # be detected in this `uttr`
  main_svs = open_top_topics_ordered(state.uttr.svs, state.uttr.counters)
  main_svs = utils.sv_existence_for_places(places_to_check, main_svs,
                                           state.uttr.counters)
  if not main_svs:
    state.uttr.counters.err('correlation_failed_existence_check_main_sv',
                            main_svs)
    state.uttr.counters.err('correlation_failed_missing_main_sv', 1)
    logging.info('Correlation found no Main SV')
    return False

  # For related SV, walk up the chain to find all SVs.
  context_svs = []
  for c_svs in svs_from_context(state.uttr):
    opened_svs = open_top_topics_ordered(c_svs, state.uttr.counters)
    context_svs = utils.sv_existence_for_places(places_to_check, opened_svs,
                                                state.uttr.counters)
    if context_svs:
      break
    else:
      state.uttr.counters.err('correlation_failed_existence_check_context_sv',
                              opened_svs)
  if not context_svs:
    state.uttr.counters.err('correlation_failed_missing_context_sv', 1)
    logging.info('Correlation found no Context SV')
    return False

  main_svs = main_svs[:_MAX_MAIN_SVS]
  context_svs = context_svs[:_MAX_CONTEXT_SVS]
  state.uttr.counters.info('correlation_main_svs', main_svs)
  state.uttr.counters.info('correlation_context_svs', context_svs)
  logging.info('Correlation Main SVs: %s', ', '.join(main_svs))
  logging.info('Correlation Context SVs: %s', ', '.join(context_svs))

  found = False
  for main_sv in main_svs:
    for context_sv in context_svs:
      if main_sv == context_sv:
        continue
      found |= _populate_correlation_chart(state, place, main_sv, context_sv)
  return found


def _populate_correlation_chart(state: PopulateState, place: Place, sv_1: str,
                                sv_2: str) -> bool:
  state.block_id += 1
  # TODO: Handle per-capita carefully.
  chart_vars = ChartVars(svs=[sv_1, sv_2],
                         block_id=state.block_id,
                         include_percapita=False,
                         response_type="scatter chart")
  return add_chart_to_utterance(ChartType.SCATTER_CHART, state, chart_vars,
                                [place], ChartOriginType.PRIMARY_CHART)
