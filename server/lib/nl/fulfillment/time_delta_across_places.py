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

from server.lib.nl import utils
from server.lib.nl.detection import Place
from server.lib.nl.detection import TimeDeltaType
from server.lib.nl.fulfillment.base import add_chart_to_utterance
from server.lib.nl.fulfillment.base import ChartVars
from server.lib.nl.fulfillment.base import populate_charts
from server.lib.nl.fulfillment.base import PopulateState
from server.lib.nl.utterance import ChartOriginType
from server.lib.nl.utterance import ChartType
from server.lib.nl.utterance import Utterance

_MAX_PLACES_TO_RETURN = 20


#
# Computes growth rate and ranks charts of child places in parent place.
#
def populate(uttr: Utterance):
  time_delta = utils.get_time_delta_types(uttr)
  place_type = utils.get_contained_in_type(uttr)
  if not time_delta or not time_delta:
    logging.info('time_delta_across_places: return unexpectedly')
    return False
  ranking_types = utils.get_ranking_types(uttr)
  return populate_charts(
      PopulateState(uttr=uttr,
                    main_cb=_populate_cb,
                    place_type=place_type,
                    ranking_types=ranking_types,
                    time_delta_types=time_delta))


def _populate_cb(state: PopulateState, chart_vars: ChartVars,
                 places: List[Place], chart_origin: ChartOriginType) -> bool:
  logging.info('populate_cb for time_delta_across_places')
  if chart_vars.event:
    utils.update_counter(state.uttr.counters,
                         'time-delta-across-places_failed_cb_events', 1)
    return False
  if not state.time_delta_types:
    utils.update_counter(state.uttr.counters,
                         'time-delta-across-places_failed_cb_notimedeltatypes',
                         1)
    return False
  if len(places) > 1:
    utils.update_counter(state.uttr.counters,
                         'time-delta-across-places_failed_cb_toomanyplaces',
                         [p.dcid for p in places])
    return False
  if len(chart_vars.svs) > 1:
    utils.update_counter(state.uttr.counters,
                         'time-delta-across-places_failed_cb_toomanysvs',
                         chart_vars.svs)
    return False
  if not state.place_type:
    utils.update_counter(state.uttr.counters,
                         'time-delta-across-places_failed_cb_missingchildtype',
                         chart_vars.svs)
    return False

  found = False
  # Compute time-delta ranks.
  rank_order = state.ranking_types[0] if state.ranking_types else None

  logging.info('Attempting to compute growth rate stats')

  # Get place DCIDs.
  parent_place = places[0].dcid
  child_places = utils.get_all_child_places([parent_place],
                                            state.place_type.value)

  dcid2place = {c.dcid: c for c in child_places}
  dcids = list(dcid2place.keys())

  direction = state.time_delta_types[0]
  ranked_children = utils.rank_places_by_series_growth(
      places=dcids,
      sv=chart_vars.svs[0],
      growth_direction=direction,
      rank_order=rank_order)

  utils.update_counter(
      state.uttr.counters, 'time-delta_reranked_places', {
          'orig': dcids,
          'ranked_abs': ranked_children.abs,
          'ranked_pct': ranked_children.pct,
      })
  block_id = chart_vars.block_id
  i = 0
  for ranked_dcids in [ranked_children.abs, ranked_children.pct]:
    ranked_places = []
    for d in ranked_dcids:
      ranked_places.append(dcid2place[d])

    # No per-capita charts.
    chart_vars.include_percapita = False
    chart_vars.block_id = block_id
    # Override the "main-place" (i.e., parent) with the child place.
    chart_vars.set_place_override_for_line = True
    chart_vars.title = utils.get_time_delta_title(
        direction=direction, is_absolute=True if i == 0 else False)
    for p in ranked_places[:_MAX_PLACES_TO_RETURN]:
      found |= add_chart_to_utterance(ChartType.TIMELINE_CHART, state,
                                      chart_vars, [p], chart_origin)
    # Avoid having the second set of charts use the same block_id than
    # others.
    block_id += 10
    i += 1
  return found
