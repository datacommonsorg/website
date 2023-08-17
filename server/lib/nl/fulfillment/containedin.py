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

from server.lib.nl.common import utils
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import ContainedInClassificationAttributes
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.base import add_chart_to_utterance
from server.lib.nl.fulfillment.base import populate_charts
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import \
    classifications_of_type_from_utterance


def populate(uttr: Utterance) -> bool:
  # Loop over all CONTAINED_IN classifications (from current to past) in order.
  classifications = classifications_of_type_from_utterance(
      uttr, ClassificationType.CONTAINED_IN)
  for classification in classifications:
    if (not classification or not isinstance(
        classification.attributes, ContainedInClassificationAttributes)):
      continue
    place_type = classification.attributes.contained_in_place_type
    if populate_charts(
        PopulateState(uttr=uttr, main_cb=_populate_cb, place_type=place_type)):
      return True
    else:
      uttr.counters.err('containedin_failed_populate_placetype',
                        place_type.value)
  return False


def _populate_cb(state: PopulateState, chart_vars: ChartVars,
                 contained_places: List[Place],
                 chart_origin: ChartOriginType) -> bool:
  logging.info('populate_cb for contained-in')

  if chart_vars.event:
    state.uttr.counters.err('containedin_failed_cb_events', 1)
    return False
  if not state.place_type:
    state.uttr.counters.err('containedin_failed_cb_missing_type', 1)
    return False
  if not utils.has_map(state.place_type, contained_places):
    state.uttr.counters.err('containedin_failed_cb_nonmap_type',
                            state.place_type)
    return False
  if not chart_vars:
    state.uttr.counters.err('containedin_failed_cb_missing_chat_vars', 1)
    return False
  if not chart_vars.svs:
    state.uttr.counters.err('containedin_failed_cb_missing_svs', 1)
    return False
  if len(contained_places) > 1:
    state.uttr.counters.err('containedin_failed_cb_toomanyplaces',
                            contained_places)
    return False

  chart_vars.response_type = "comparison map"
  add_chart_to_utterance(ChartType.MAP_CHART, state, chart_vars,
                         contained_places, chart_origin)
  return True
