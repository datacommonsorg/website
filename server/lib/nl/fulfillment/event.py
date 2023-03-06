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

from typing import List

from server.lib.nl import detection
from server.lib.nl import utils
import server.lib.nl.fulfillment.base as base
import server.lib.nl.fulfillment.context as ctx
import server.lib.nl.utterance as nl_uttr

_DEFAULT_EVENT_PLACE = detection.Place("country/USA", "USA", "Country")

#
# Handler for Event queries.
#


def populate(uttr: nl_uttr.Utterance) -> bool:
  event_classification = ctx.classifications_of_type_from_utterance(
      uttr, detection.ClassificationType.EVENT)
  if (not event_classification or
      not isinstance(event_classification[0].attributes,
                     detection.EventClassificationAttributes) or
      not event_classification[0].attributes.event_types):
    utils.update_counter(uttr.counters, 'event_failed_no_event_types', 1)
    return False
  event_types = event_classification[0].attributes.event_types

  ranking_classification = ctx.classifications_of_type_from_utterance(
      uttr, detection.ClassificationType.RANKING)
  ranking_types = []
  if (ranking_classification and
      isinstance(ranking_classification[0].attributes,
                 detection.RankingClassificationAttributes) and
      ranking_classification[0].attributes.ranking_type):
    ranking_types = ranking_classification[0].attributes.ranking_type

  return _populate_event(
      base.PopulateState(uttr=uttr, main_cb=None, ranking_types=ranking_types),
      event_types)


def _populate_event(state: base.PopulateState,
                    event_types: List[detection.EventType]) -> bool:
  for pl in state.uttr.places:
    if (_populate_event_for_place(state, event_types, pl)):
      return True
    else:
      utils.update_counter(state.uttr.counters,
                           'event_failed_populate_main_place', pl.dcid)
  if not state.uttr.places:
    for pl in ctx.places_from_context(state.uttr):
      if (_populate_event_for_place(state, event_types, pl)):
        return True
      else:
        utils.update_counter(state.uttr.counters,
                             'event_failed_populate_context_place', pl.dcid)

  # Use a default of USA.
  return _populate_event_for_place(state, event_types, _DEFAULT_EVENT_PLACE)


def _populate_event_for_place(state: base.PopulateState,
                              event_types: List[detection.EventType],
                              place: detection.Place) -> bool:
  event_type = event_types[0]
  if not utils.event_existence_for_place(place.dcid, event_type):
    utils.update_counter(state.uttr.counters, 'event_failed_existence_check', {
        'place': place.dcid,
        'event': event_type
    })
    return False

  state.block_id += 1
  chart_vars = base.ChartVars(svs=[],
                              event=event_types[0],
                              block_id=state.block_id,
                              include_percapita=False)
  return base.add_chart_to_utterance(base.ChartType.EVENT_CHART, state,
                                     chart_vars, [place],
                                     base.ChartOriginType.PRIMARY_CHART)
