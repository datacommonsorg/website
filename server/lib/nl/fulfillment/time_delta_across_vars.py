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
import os
from typing import List

from flask import current_app

from server.lib import util as libutil
from server.lib.nl.common import rank_utils
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance


#
# Computes growth rate and ranks charts of comparable peer SVs.
#
def populate(state: PopulateState, chart_vars: ChartVars, places: List[Place],
             chart_origin: ChartOriginType, _: int) -> bool:
  logging.info('populate_cb for time_delta_across_vars')
  if chart_vars.event:
    state.uttr.counters.err('time-delta-across-vars_failed_cb_events', 1)
    return False
  if not state.time_delta_types:
    state.uttr.counters.err('time-delta-across-vars_failed_cb_notimedeltatypes',
                            1)
    return False
  if len(places) > 1:
    state.uttr.counters.err('time-delta-across-vars_failed_cb_toomanyplaces',
                            [p.dcid for p in places])
    return False
  if len(chart_vars.svs) < 2:
    state.uttr.counters.err('time-delta-across-vars_failed_cb_toofewsvs',
                            chart_vars.svs)
    return False
  if not chart_vars.is_topic_peer_group:
    state.uttr.counters.err('time-delta-across-vars_failed_cb_nopeergroup',
                            chart_vars.svs)
    return False

  found = False
  # Compute time-delta ranks.
  rank_order = state.ranking_types[0] if state.ranking_types else None
  logging.info('Attempting to compute growth rate stats')

  if os.environ.get('FLASK_ENV') == 'test':
    nopc_vars = libutil.get_nl_no_percapita_vars()
  else:
    nopc_vars = current_app.config['NOPC_VARS']

  direction = state.time_delta_types[0]
  ranked_lists = rank_utils.rank_svs_by_series_growth(
      place=places[0].dcid,
      svs=chart_vars.svs,
      growth_direction=direction,
      rank_order=rank_order,
      nopc_vars=nopc_vars,
      counters=state.uttr.counters)

  state.uttr.counters.info(
      'time-delta-across-vars_reranked_svs', {
          'orig': chart_vars.svs,
          'ranked_abs': ranked_lists.abs,
          'ranked_pct': ranked_lists.pct,
      })

  for field, ranked_svs in ranked_lists._asdict().items():
    if not ranked_svs:
      continue
    chart_vars.svs = ranked_svs
    chart_vars.growth_direction = direction
    chart_vars.growth_ranking_type = field

    # TODO: Uncomment this once we agree on look and feel.
    if field == 'abs':
      found |= add_chart_to_utterance(ChartType.TIMELINE_WITH_HIGHLIGHT, state,
                                      chart_vars, places, chart_origin)

    found |= add_chart_to_utterance(ChartType.RANKED_TIMELINE_COLLECTION, state,
                                    chart_vars, places, chart_origin)

  return found
