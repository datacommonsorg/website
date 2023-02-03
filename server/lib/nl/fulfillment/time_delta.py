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

from lib.nl import utils
from lib.nl.detection import ClassificationType
from lib.nl.detection import Place
from lib.nl.detection import RankingClassificationAttributes
from lib.nl.detection import TimeDeltaClassificationAttributes
from lib.nl.fulfillment import context
from lib.nl.fulfillment.base import add_chart_to_utterance
from lib.nl.fulfillment.base import ChartVars
from lib.nl.fulfillment.base import overview_fallback
from lib.nl.fulfillment.base import populate_charts
from lib.nl.fulfillment.base import PopulateState
from lib.nl.utterance import ChartOriginType
from lib.nl.utterance import ChartType
from lib.nl.utterance import Utterance


#
# Computes growth rate and ranks charts of comparable peer SVs.
#
def populate(uttr: Utterance):
  time_delta_classification = context.classifications_of_type_from_utterance(
      uttr, ClassificationType.TIME_DELTA)
  # Get time delta type
  if (not time_delta_classification or
      not isinstance(time_delta_classification[0].attributes,
                     TimeDeltaClassificationAttributes) or
      not time_delta_classification[0].attributes.time_delta_types):
    return False
  time_delta = time_delta_classification[0].attributes.time_delta_types

  # Get potential ranking type
  current_ranking_classification = context.classifications_of_type_from_utterance(
      uttr, ClassificationType.RANKING)
  ranking_types = []
  if (current_ranking_classification and
      isinstance(current_ranking_classification[0].attributes,
                 RankingClassificationAttributes) and
      current_ranking_classification[0].attributes.ranking_type):
    ranking_types = current_ranking_classification[0].attributes.ranking_type

  return populate_charts(
      PopulateState(uttr=uttr,
                    main_cb=_populate_cb,
                    fallback_cb=overview_fallback,
                    ranking_types=ranking_types,
                    time_delta_types=time_delta))


def _populate_cb(state: PopulateState, chart_vars: ChartVars,
                 places: List[Place], chart_origin: ChartOriginType) -> bool:
  logging.info('populate_cb for time_delta')
  if not state.time_delta_types:
    return False
  if len(places) > 1:
    return False
  if len(chart_vars.svs) < 2:
    return False
  if not chart_vars.is_topic_peer_group:
    return False

  found = False
  # Compute time-delta ranks.
  rank_order = state.ranking_types[0] if state.ranking_types else None
  logging.info('Attempting to compute growth rate stats')
  chart_vars.svs = utils.rank_svs_by_growth_rate(
      place=places[0].dcid,
      svs=chart_vars.svs,
      growth_direction=state.time_delta_types[0],
      rank_order=rank_order)
  for sv in chart_vars.svs:
    cv = chart_vars
    cv.svs = [sv]
    cv.response_type = "growth chart"
    # TODO: desc string should take into account rank order
    found |= add_chart_to_utterance(ChartType.TIMELINE_CHART, state, cv, places,
                                    chart_origin)
  return found
