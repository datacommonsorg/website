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

from lib.nl.detection import ClassificationType
from lib.nl.detection import ContainedInClassificationAttributes
from lib.nl.detection import ContainedInPlaceType
from lib.nl.detection import Place
from lib.nl.detection import RankingClassificationAttributes
from lib.nl.detection import RankingType
from lib.nl.fulfillment.base import add_chart_to_utterance
from lib.nl.fulfillment.base import ChartVars
from lib.nl.fulfillment.base import populate_charts
from lib.nl.fulfillment.base import PopulateState
from lib.nl.fulfillment.context import classifications_of_type_from_context
from lib.nl.utterance import ChartOriginType
from lib.nl.utterance import ChartType
from lib.nl.utterance import Utterance


def populate(uttr: Utterance):
  # Get all RANKING classifications in the context.
  ranking_classifications = classifications_of_type_from_context(
      uttr, ClassificationType.RANKING)
  # Get all CONTAINED_IN classifications in the context.
  contained_classifications = classifications_of_type_from_context(
      uttr, ClassificationType.CONTAINED_IN)

  # Loop over all ranking classifications.
  for ranking_classification in ranking_classifications:
    if (not ranking_classification or not isinstance(
        ranking_classification.attributes, RankingClassificationAttributes)):
      continue
    if not ranking_classification.attributes.ranking_type:
      continue
    ranking_types = ranking_classification.attributes.ranking_type
    # For every ranking classification, loop over contained-in classification,
    # and call populate_charts()
    for contained_classification in contained_classifications:
      if (not contained_classification or
          not isinstance(contained_classification.attributes,
                         ContainedInClassificationAttributes)):
        continue
      place_type = contained_classification.attributes.contained_in_place_type
      if populate_charts(
          PopulateState(uttr=uttr,
                        main_cb=_populate_cb,
                        fallback_cb=_fallback_cb,
                        place_type=place_type,
                        ranking_types=ranking_types)):
        return True

  # Fallback
  ranking_types = [RankingType.HIGH]
  place_type = ContainedInPlaceType.COUNTY
  return populate_charts(
      PopulateState(uttr=uttr,
                    main_cb=_populate_cb,
                    fallback_cb=_fallback_cb,
                    place_type=place_type,
                    ranking_types=ranking_types))


def _populate_cb(state: PopulateState, chart_vars: ChartVars,
                 containing_places: List[Place],
                 chart_origin: ChartOriginType) -> bool:
  if not state.place_type or not state.ranking_types:
    return False
  if len(containing_places) > 1:
    return False
  if len(chart_vars.svs) > 1:
    # We don't handle peer group SVs
    return False
  add_chart_to_utterance(ChartType.RANKING_CHART, state, chart_vars,
                         containing_places, chart_origin)
  return True


def _fallback_cb(state: PopulateState, containing_places: List[Place],
                 chart_origin: ChartOriginType) -> bool:
  # TODO: Poor choice, do better.
  sv = "Count_Person"
  state.block_id += 1
  chart_vars = ChartVars(svs=[sv], block_id=state.block_id)
  return _populate_cb(state, chart_vars, containing_places, chart_origin)
