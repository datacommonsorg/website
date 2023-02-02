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

from lib.nl.detection import ClassificationType
from lib.nl.detection import ContainedInClassificationAttributes
from lib.nl.detection import ContainedInPlaceType
from lib.nl.detection import Place
from lib.nl.fulfillment.base import add_chart_to_utterance
from lib.nl.fulfillment.base import ChartVars
from lib.nl.fulfillment.base import overview_fallback
from lib.nl.fulfillment.base import populate_charts
from lib.nl.fulfillment.base import PopulateState
from lib.nl.fulfillment.context import classifications_of_type_from_context
from lib.nl.utterance import ChartOriginType
from lib.nl.utterance import ChartType
from lib.nl.utterance import Utterance


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
                      fallback_cb=overview_fallback,
                      place_type=place_type)):
      return True
  # TODO: poor default; should do this based on main place
  place_type = ContainedInPlaceType.COUNTY
  return populate_charts(
      PopulateState(uttr=uttr,
                    main_cb=_populate_cb,
                    fallback_cb=overview_fallback,
                    place_type=place_type))


def _populate_cb(state: PopulateState, chart_vars: ChartVars,
                 contained_places: List[Place],
                 chart_origin: ChartOriginType) -> bool:
  logging.info('populate_cb for contained-in')

  if not state.place_type:
    return False
  if not chart_vars:
    return False
  if len(contained_places) > 1:
    return False

  for sv in chart_vars.svs:
    cv = chart_vars
    cv.svs = [sv]
    add_chart_to_utterance(ChartType.MAP_CHART, state, cv, contained_places,
                           chart_origin)
  return True
