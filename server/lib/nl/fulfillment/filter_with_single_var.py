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

import copy
import logging
from typing import List

from server.lib.nl.common import constants
from server.lib.nl.common import rank_utils
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance

# TODO: Support per-capita
# TODO: Increase this after frontend handles comparedPlaces better.
_MAX_PLACES_TO_RETURN = 7


#
# Computes ranked list of places after applying the filter
#
def populate(state: PopulateState, chart_vars: ChartVars, places: List[Place],
             chart_origin: ChartOriginType, rank: int) -> bool:
  logging.info('populate_cb for filter_with_single_var')
  if chart_vars.event:
    state.uttr.counters.err('filter-with-single-var_failed_cb_events', 1)
    return False
  if len(places) > 1:
    state.uttr.counters.err('filter-with-single-var_failed_cb_toomanyplaces',
                            [p.dcid for p in places])
    return False
  if len(chart_vars.svs) > 1 and chart_vars.is_topic_peer_group:
    state.uttr.counters.err('filter-with-single-var_failed_cb_peergroupsvs',
                            chart_vars.svs)
    return False
  if not state.place_type:
    state.uttr.counters.err('filter-with-single-var_failed_cb_missingchildtype',
                            chart_vars.svs)
    return False
  if state.uttr.chartCandidates:
    # If we already have chart-candidates avoid adding more.
    # Just report we're done.
    return True

  found = False

  logging.info('Attempting to filter places')
  sv = chart_vars.svs[0]
  chart_vars = copy.deepcopy(chart_vars)
  chart_vars.svs = [sv]

  ranked_children = rank_utils.filter_and_rank_places(
      parent_place=places[0],
      child_type=state.place_type,
      sv=sv,
      filter=state.quantity)

  if not ranked_children:
    state.uttr.counters.err('filter-with-single-var_emptyresults', 1)
    return False

  show_lowest = rank_utils.sort_filtered_results_lowest_first(state.quantity)
  if show_lowest:
    ranked_children.reverse()
  shortlist = ranked_children[:_MAX_PLACES_TO_RETURN]

  if rank == 0:
    # Set answer places.
    ans_places = copy.deepcopy(ranked_children[:constants.MAX_ANSWER_PLACES])
    state.uttr.answerPlaces = ans_places
    state.uttr.counters.info('filter-with-single-var_answer_places',
                             [p.dcid for p in ans_places])

  # Compute title suffix.
  if len(ranked_children) > _MAX_PLACES_TO_RETURN:
    first = 'Bottom' if show_lowest else 'Top'
    last = f'{_MAX_PLACES_TO_RETURN} of {len(ranked_children)}'
    chart_vars.title_suffix = first + ' ' + last

  found |= add_chart_to_utterance(ChartType.BAR_CHART, state, chart_vars,
                                  shortlist, chart_origin)

  state.uttr.counters.info('filter-with-single-var_ranked_places', {
      'sv': sv,
      'show_lowest': show_lowest,
      'places': [p.name for p in shortlist],
  })

  return found
