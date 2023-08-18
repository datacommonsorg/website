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

from server.lib.nl.common import utils
import server.lib.nl.common.utterance as nl_uttr
from server.lib.nl.detection import types
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
import server.lib.nl.fulfillment.utils as futils

#
# Handler for Event queries.
#


def populate(uttr: nl_uttr.Utterance) -> bool:
  event_classification = futils.classifications_of_type_from_utterance(
      uttr, types.ClassificationType.EVENT)
  if (not event_classification or
      not isinstance(event_classification[0].attributes,
                     types.EventClassificationAttributes) or
      not event_classification[0].attributes.event_types):
    uttr.counters.err('event_failed_no_event_types', 1)
    return False
  event_types = event_classification[0].attributes.event_types

  ranking_classification = futils.classifications_of_type_from_utterance(
      uttr, types.ClassificationType.RANKING)
  ranking_types = []
  if (ranking_classification and
      isinstance(ranking_classification[0].attributes,
                 types.RankingClassificationAttributes) and
      ranking_classification[0].attributes.ranking_type):
    ranking_types = ranking_classification[0].attributes.ranking_type

  return _populate_event(PopulateState(uttr=uttr, ranking_types=ranking_types),
                         event_types)


def _populate_event(state: PopulateState,
                    event_types: List[types.EventType]) -> bool:
  for pl in state.uttr.places:
    if (_populate_event_for_place(state, event_types, pl)):
      return True
    else:
      state.uttr.counters.err('event_failed_populate_main_place', pl.dcid)

  return False


def _populate_event_for_place(state: PopulateState,
                              event_types: List[types.EventType],
                              place: types.Place) -> bool:
  event_type = event_types[0]
  if not utils.event_existence_for_place(place.dcid, event_type,
                                         state.uttr.counters):
    state.uttr.counters.err('event_failed_existence_check', {
        'place': place.dcid,
        'event': event_type
    })
    return False

  state.block_id += 1
  chart_vars = ChartVars(svs=[],
                         event=event_types[0],
                         block_id=state.block_id,
                         include_percapita=False)
  return futils.add_chart_to_utterance(nl_uttr.ChartType.EVENT_CHART, state,
                                       chart_vars, [place],
                                       nl_uttr.ChartOriginType.PRIMARY_CHART)
