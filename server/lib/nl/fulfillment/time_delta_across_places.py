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
import os
from typing import List

from flask import current_app

from server.lib import util as libutil
from server.lib.nl.common import constants
from server.lib.nl.common import rank_utils
from server.lib.nl.common import utils
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance

_MAX_PLACES_TO_RETURN = 10


#
# Computes growth rate and ranks charts of child places in parent place.
#
def populate(state: PopulateState, chart_vars: ChartVars, places: List[Place],
             chart_origin: ChartOriginType, rank: int) -> bool:
  logging.info('populate_cb for time_delta_across_places')
  if chart_vars.event:
    state.uttr.counters.err('time-delta-across-places_failed_cb_events', 1)
    return False
  if not state.time_delta_types:
    state.uttr.counters.err(
        'time-delta-across-places_failed_cb_notimedeltatypes', 1)
    return False
  if len(chart_vars.svs) > 1:
    state.uttr.counters.err('time-delta-across-places_failed_cb_toomanysvs',
                            chart_vars.svs)
    return False
  if not state.place_type and len(state.uttr.places) == 1:
    state.uttr.counters.err(
        'time-delta-across-places_failed_cb_missingchildtype', chart_vars.svs)
    return False
  if state.uttr.answerPlaces:
    # We've already answered this query
    state.uttr.counters.err(
        'time-delta-across-places_failed_alreadyanswered', len(state.uttr.answerPlaces))
    return False


  found = False
  # Compute time-delta ranks.
  rank_order = state.ranking_types[0] if state.ranking_types else None

  logging.info('Attempting to compute growth rate stats')

  # Get place DCIDs.
  if len(places) > 1:
    # This is place comparison!
    child_places = places
  else:
    parent_place = places[0].dcid
    child_places = utils.get_all_child_places([parent_place],
                                              state.place_type.value,
                                              state.uttr.counters)

  dcid2place = {c.dcid: c for c in child_places}
  dcids = list(dcid2place.keys())

  if os.environ.get('FLASK_ENV') == 'test':
    nopc_vars = libutil.get_nl_no_percapita_vars()
  else:
    nopc_vars = current_app.config['NOPC_VARS']

  direction = state.time_delta_types[0]
  ranked_children = rank_utils.rank_places_by_series_growth(
      places=dcids,
      sv=chart_vars.svs[0],
      growth_direction=direction,
      rank_order=rank_order,
      counters=state.uttr.counters,
      nopc_vars=nopc_vars)

  state.uttr.counters.info(
      'time-delta_reranked_places', {
          'orig': dcids,
          'ranked_abs': ranked_children.abs,
          'ranked_pct': ranked_children.pct,
      })
  for field, ranked_dcids in ranked_children._asdict().items():
    # Unless there are at least 2 places don't do this.
    if len(ranked_dcids) < 2:
      continue
    ranked_places = []
    for d in ranked_dcids:
      ranked_places.append(dcid2place[d])

    if rank == 0 and field == 'abs' and ranked_places and len(places) == 1:
      state.uttr.answerPlaces[state.place_type.value] = \
        copy.deepcopy(ranked_places[:constants.MAX_ANSWER_PLACES])

    chart_vars.growth_direction = direction
    chart_vars.growth_ranking_type = field
    ranked_places = ranked_places[:_MAX_PLACES_TO_RETURN]

    found |= add_chart_to_utterance(ChartType.RANKED_TIMELINE_COLLECTION, state,
                                    chart_vars, ranked_places, chart_origin)

  return found
