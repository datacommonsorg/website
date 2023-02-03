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
from typing import List

from lib.nl import detection
from lib.nl import utils
import lib.nl.fulfillment.base as base
import lib.nl.fulfillment.context as ctx
import lib.nl.utterance as nl_uttr

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
      base.PopulateState(uttr=uttr,
                         main_cb=None,
                         fallback_cb=None,
                         ranking_types=ranking_types), event_types)


def _populate_event(state: base.PopulateState,
                    event_types: List[detection.EventType]) -> bool:
  for pl in state.uttr.places:
    if (_populate_event_for_place(state, event_types, pl)):
      return True
  for pl in ctx.places_from_context(state.uttr):
    if (_populate_event_for_place(state, event_types, pl)):
      return True
  return False


def _populate_event_for_place(state: base.PopulateState,
                              event_types: List[detection.EventType],
                              place: detection.Place) -> bool:
  # TODO: Perform some form of existence check.

  etype_str = str(event_types[0].value)
  state.block_id += 1
  chart_vars = base.ChartVars(svs=[etype_str],
                              block_id=state.block_id,
                              include_percapita=False)
  return base.add_chart_to_utterance(base.ChartType.EVENT_CHART, state,
                                     chart_vars, [place],
                                     base.ChartOriginType.PRIMARY_CHART)
