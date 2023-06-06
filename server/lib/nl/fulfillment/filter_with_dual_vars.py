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

from server.lib.nl.common import rank_utils
from server.lib.nl.common import utils
from server.lib.nl.common.topic import open_top_topics_ordered
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.base import add_chart_to_utterance
from server.lib.nl.fulfillment.base import populate_charts
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState

# TODO: Support per-capita
# TODO: Increase this after frontend handles comparedPlaces better.
_MAX_PLACES_TO_RETURN = 7


#
# From the list of multi-sv candidates, this function finds the
# dual SV candidate and then returns the first or second part
# depending on the value of idx.
#
def _get_dual_sv_part(uttr: Utterance, idx: int) -> List[str]:
  for c in uttr.multi_svs.candidates:
    if len(c.parts) == 2:
      return c.parts[idx].svs
  return []


#
# Computes ranked list of places after applying the filter and
# retrieve a var for those places.
#
def populate(uttr: Utterance):
  quantity = utils.get_quantity(uttr)
  if not quantity:
    uttr.counters.err('filter-with-dual-var_missingquantity', 1)
    return False
  place_type = utils.get_contained_in_type(uttr)
  if not place_type:
    place_type = ContainedInPlaceType.DEFAULT_TYPE

  # We always assume the 2nd SV is the filter SV.
  svs = _get_dual_sv_part(uttr, 1)
  if not svs:
    uttr.counters.err('filter-with-dual-var_notdualsv', 1)
    return False

  # Update `svs` in uttr across the call to populate_charts()
  orig_svs = uttr.svs
  uttr.svs = svs
  found = populate_charts(
      PopulateState(uttr=uttr,
                    main_cb=_populate_cb,
                    place_type=place_type,
                    quantity=quantity))
  uttr.svs = orig_svs
  return found


# TODO: Consider deduping with filter_with_single_var._populate_cb.
def _populate_cb(state: PopulateState, chart_vars: ChartVars,
                 places: List[Place], chart_origin: ChartOriginType) -> bool:
  logging.info('populate_cb for filter_with_dual_vars')
  if chart_vars.event:
    state.uttr.counters.err('filter-with-dual-vars_failed_cb_events', 1)
    return False
  if len(places) > 1:
    state.uttr.counters.err('filter-with-dual-vars_failed_cb_toomanyplaces',
                            [p.dcid for p in places])
    return False
  if len(chart_vars.svs) > 1:
    state.uttr.counters.err('filter-with-dual-vars_failed_cb_toomanysvs',
                            chart_vars.svs)
    return False
  if not state.place_type:
    state.uttr.counters.err('filter-with-dual-vars_failed_cb_missingchildtype',
                            chart_vars.svs)
    return False
  if state.uttr.chartCandidates:
    # If we already have chart-candidates avoid adding more.
    # Just report we're done.
    return True

  logging.info('Attempting to filter places')
  sv = chart_vars.svs[0]

  ranked_children = rank_utils.filter_and_rank_places(
      parent_place=places[0],
      child_type=state.place_type,
      sv=sv,
      filter=state.quantity)

  if not ranked_children:
    state.uttr.counters.err('filter-with-dual-vars_emptyresults', 1)
    return False

  show_lowest = rank_utils.sort_filtered_results_lowest_first(state.quantity)
  if show_lowest:
    ranked_children.reverse()
  shortlist = ranked_children[:_MAX_PLACES_TO_RETURN]
  logging.info(f'shortlist is {shortlist}')

  place_dcids = [p.dcid for p in shortlist]

  # Get the first SV from dual-sv.
  selected_svs = _get_dual_sv_part(state.uttr, 0)
  if not selected_svs:
    state.uttr.context.err('filter-with-dual-vars_selectsvsempty', 1)
    return False

  # Open topics if necessary.
  selected_svs = open_top_topics_ordered(selected_svs, state.uttr.counters)

  # Perform existence checks.
  selected_svs = utils.sv_existence_for_places(place_dcids, selected_svs,
                                               state.uttr.counters)
  if not selected_svs:
    state.uttr.counters.err('filter-with-dual-vars_selectedexistencefailed',
                            selected_svs)
    return False
  logging.info(f'post-existence check vars: {selected_svs}')

  # Compute title suffix.
  if len(ranked_children) > _MAX_PLACES_TO_RETURN:
    first = 'Bottom' if show_lowest else 'Top'
    last = f'{_MAX_PLACES_TO_RETURN} of {len(ranked_children)}'
    chart_vars.title_suffix = first + ' ' + last
  chart_vars.include_percapita = False

  found = False
  for sv in selected_svs:
    cv = copy.deepcopy(chart_vars)
    cv.svs = [sv]
    logging.info(f'adding to dual-sv chart: {sv}')
    found |= add_chart_to_utterance(ChartType.BAR_CHART, state, cv, shortlist,
                                    chart_origin)

  state.uttr.counters.info(
      'filter-with-dual-vars_ranked_places', {
          'svs': selected_svs,
          'show_lowest': show_lowest,
          'places': [p.name for p in shortlist],
      })

  return found
