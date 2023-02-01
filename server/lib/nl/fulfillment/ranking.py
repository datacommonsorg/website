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

from lib.nl import utils
from lib.nl.detection import ClassificationType
from lib.nl.detection import ContainedInClassificationAttributes
from lib.nl.detection import ContainedInPlaceType
from lib.nl.detection import Place
from lib.nl.detection import RankingClassificationAttributes
from lib.nl.detection import RankingType
from lib.nl.fulfillment import context
from lib.nl.fulfillment.base import add_chart_to_utterance
from lib.nl.fulfillment.base import ChartVars
from lib.nl.fulfillment.base import populate_charts
from lib.nl.fulfillment.base import PopulateState
from lib.nl.utterance import ChartOriginType
from lib.nl.utterance import ChartType
from lib.nl.utterance import Utterance


#
# This handles both ranking across places and ranking across SVS.
#
# * For ranking across places, we should detect a ranking and contained-in
#   classification in the current utterance.  For example, [counties with most rainfall],
#   assuming california is in the context.
# * For ranking across SVS, we should detect a ranking, but not contained-in
#   classification in the current utterance.  In the callback, we will also
#   check that the SVs are part of a peer group (only those are comparable!).
#   For example, [most grown agricultural things], again assuming california
#   is in the context.
#
def populate(uttr: Utterance):
  # Get the RANKING classifications from the current utterance. That is what
  # let us infer this is ranking query-type.
  current_ranking_classification = context.classifications_of_type_from_utterance(
      uttr, ClassificationType.RANKING)

  if (current_ranking_classification and
      isinstance(current_ranking_classification[0].attributes,
                 RankingClassificationAttributes) and
      current_ranking_classification[0].attributes.ranking_type):
    ranking_types = current_ranking_classification[0].attributes.ranking_type

    current_contained_classification = context.classifications_of_type_from_utterance(
        uttr, ClassificationType.CONTAINED_IN)
    if (current_contained_classification and
        isinstance(current_contained_classification[0].attributes,
                   ContainedInClassificationAttributes)):
      # Ranking among places.
      place_type = current_contained_classification[
          0].attributes.contained_in_place_type
      if populate_charts(
          PopulateState(uttr=uttr,
                        main_cb=_populate_cb,
                        fallback_cb=_fallback_cb,
                        place_type=place_type,
                        ranking_types=ranking_types)):
        return True
    else:
      # Ranking among stat-vars.
      if populate_charts(
          PopulateState(uttr=uttr,
                        main_cb=_populate_cb,
                        fallback_cb=_fallback_cb,
                        ranking_types=ranking_types)):
        return True

  # TODO: Consider if we want to go inside past contained-in classifications.
  # That might be a bit non-intuitive though.

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
                 places: List[Place], chart_origin: ChartOriginType) -> bool:
  if not state.ranking_types:
    return False
  if len(places) > 1:
    return False

  if state.place_type and len(chart_vars.svs) == 1:
    # Ranking among places.
    return add_chart_to_utterance(ChartType.RANKING_CHART, state, chart_vars,
                                  places, chart_origin)
  elif (not state.place_type and chart_vars.is_topic_peer_group and
        len(chart_vars.svs) > 1):
    # Ranking among peer group of SVs.
    chart_vars.svs = utils.ranked_svs_for_place(places[0].dcid, chart_vars.svs,
                                                state.ranking_types[0])
    return add_chart_to_utterance(ChartType.BAR_CHART, state, chart_vars,
                                  places, chart_origin)
  return False


def _fallback_cb(state: PopulateState, containing_places: List[Place],
                 chart_origin: ChartOriginType) -> bool:
  # TODO: Poor choice, do better.
  sv = "Count_Person"
  state.block_id += 1
  chart_vars = ChartVars(svs=[sv], block_id=state.block_id)
  return _populate_cb(state, chart_vars, containing_places, chart_origin)
