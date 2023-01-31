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

from lib.nl.detection import ClassificationType, \
  ContainedInPlaceType, ContainedInClassificationAttributes, Place
from lib.nl.utterance import Utterance, ChartOriginType, ChartType
from lib.nl.fulfillment.base import populate_charts, PopulateState, ChartVars, \
  add_chart_to_utterance
from lib.nl.fulfillment.context import classifications_of_type_from_context


def populate(uttr: Utterance) -> bool:
  # Loop over all CONTAINED_IN classifications (from current to past) in order.
  classifications = classifications_of_type_from_context(
      uttr, ClassificationType.CONTAINED_IN)
  for classification in classifications:
    if (not classification or not isinstance(
        classification.attributes, ContainedInClassificationAttributes)):
      continue
    place_type = classification.attributes.contained_in_place_type
    if populate_charts(
        PopulateState(uttr=uttr,
                      main_cb=_populate_cb,
                      fallback_cb=_fallback_cb,
                      place_type=place_type)):
      return True
  # TODO: poor default; should do this based on main place
  place_type = ContainedInPlaceType.COUNTY
  return populate_charts(
      PopulateState(uttr=uttr,
                    main_cb=_populate_cb,
                    fallback_cb=_fallback_cb,
                    place_type=place_type))


def _populate_cb(state: PopulateState, chart_vars: ChartVars,
                 contained_places: List[Place],
                 chart_origin: ChartOriginType) -> bool:
  if not state.place_type:
    return False
  if not chart_vars:
    return False
  if len(contained_places) > 1:
    return False
  if len(chart_vars.svs) > 1:
    # We don't handle peer group SVs
    return False
  add_chart_to_utterance(ChartType.MAP_CHART, state, chart_vars,
                         contained_places, chart_origin)
  return True


def _fallback_cb(state: PopulateState, containing_places: List[Place],
                 chart_origin: ChartOriginType) -> bool:
  # TODO: Poor choice, do better.
  sv = "Count_Person"
  state.block_id += 1
  chart_vars = ChartVars(svs=[sv], block_id=state.block_id)
  return _populate_cb(state, chart_vars, containing_places, chart_origin)
