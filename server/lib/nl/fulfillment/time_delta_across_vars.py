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
from server.lib.nl.fulfillment.base import add_chart_to_utterance
from server.lib.nl.fulfillment.base import ChartVars
from server.lib.nl.fulfillment.base import populate_charts
from server.lib.nl.fulfillment.base import PopulateState
from server.lib.nl.utterance import ChartOriginType
from server.lib.nl.utterance import ChartType
from server.lib.nl.utterance import Utterance


#
# Computes growth rate and ranks charts of comparable peer SVs.
#
def populate(uttr: Utterance):
  time_delta = utils.get_time_delta_types(uttr)
  if not time_delta:
    return False
  ranking_types = utils.get_ranking_types(uttr)
  return populate_charts(
      PopulateState(uttr=uttr,
                    main_cb=_populate_cb,
                    ranking_types=ranking_types,
                    time_delta_types=time_delta))


def _populate_cb(state: PopulateState, chart_vars: ChartVars,
                 places: List[Place], chart_origin: ChartOriginType) -> bool:
  logging.info('populate_cb for time_delta_across_vars')
  if chart_vars.event:
    utils.update_counter(state.uttr.counters,
                         'time-delta-across-vars_failed_cb_events', 1)
    return False
  if not state.time_delta_types:
    utils.update_counter(state.uttr.counters,
                         'time-delta-across-vars_failed_cb_notimedeltatypes', 1)
    return False
  if len(places) > 1:
    utils.update_counter(state.uttr.counters,
                         'time-delta-across-vars_failed_cb_toomanyplaces',
                         [p.dcid for p in places])
    return False
  if len(chart_vars.svs) < 2:
    utils.update_counter(state.uttr.counters,
                         'time-delta-across-vars_failed_cb_toofewsvs',
                         chart_vars.svs)
    return False
  if not chart_vars.is_topic_peer_group:
    utils.update_counter(state.uttr.counters,
                         'time-delta-across-vars_failed_cb_nopeergroup',
                         chart_vars.svs)
    return False

  found = False
  # Compute time-delta ranks.
  rank_order = state.ranking_types[0] if state.ranking_types else None
  logging.info('Attempting to compute growth rate stats')
  ranked_svs = utils.rank_svs_by_growth_rate(
      place=places[0].dcid,
      svs=chart_vars.svs,
      growth_direction=state.time_delta_types[0],
      rank_order=rank_order)
  utils.update_counter(state.uttr.counters,
                       'time-delta-across-vars_reranked_svs', {
                           'orig': chart_vars.svs,
                           'ranked': ranked_svs,
                       })
  for sv in ranked_svs:
    cv = chart_vars
    cv.svs = [sv]
    cv.response_type = "growth chart"
    # TODO: desc string should take into account rank order
    found |= add_chart_to_utterance(ChartType.TIMELINE_CHART, state, cv, places,
                                    chart_origin)
  return found
