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
from typing import List

from server.lib.nl.common.commentary import COMPARISON_MISSING_PLACE_MSG
import server.lib.nl.common.existence_util as ext
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import add_chart_to_utterance
from server.lib.nl.fulfillment.utils import get_max_ans_places
from server.lib.nl.fulfillment.utils import get_places_as_string


def _get_info_message(exist_places: List[Place], all_places: List[Place]):
  if exist_places == all_places:
    return ''
  else:
    exist_place_dcids = list(map(lambda x: x.dcid, exist_places))
    exist_places_set = set(exist_place_dcids)
    missing_place_names = []
    for pl in all_places:
      if not pl.dcid in exist_places_set:
        missing_place_names.append(pl.name)
    missing_places_str = get_places_as_string(missing_place_names)
    return COMPARISON_MISSING_PLACE_MSG.format(
        missing_places=missing_places_str)


def populate(state: PopulateState, chart_vars: ChartVars, places: List[Place],
             chart_origin: ChartOriginType, rank: int) -> bool:
  if len(places) < 2:
    state.uttr.counters.err('comparison_failed_cb_toofewplaces', 1)
    return False
  if chart_vars.event:
    state.uttr.counters.err('comparison_failed_cb_events', 1)
    return False

  if rank == 0:
    dcids = [p.dcid for p in places]
    state.uttr.counters.info('comparison_place_candidates', dcids)

  found = False
  if not chart_vars.is_topic_peer_group:
    for i, sv in enumerate(chart_vars.svs):
      exist_places = [
          p for p in places if ext.svs4place(state, p, [sv]).exist_svs
      ]
      # Main existence check
      if len(exist_places) <= 1:
        continue

      info_msg = _get_info_message(exist_places, places)
      if i == 0:
        # This is for setting answer places.
        places = exist_places

      cv = copy.deepcopy(chart_vars)
      cv.svs = [sv]
      sv_place_latest_date = ext.get_sv_place_latest_date([sv], places, None,
                                                          state.exist_checks)
      found |= add_chart_to_utterance(ChartType.BAR_CHART,
                                      state,
                                      cv,
                                      exist_places,
                                      chart_origin,
                                      info_message=info_msg,
                                      sv_place_latest_date=sv_place_latest_date)
  else:
    exist_svs = []
    # Pick variables that exist in at least 2 place, so each variable is comparable.
    for sv in chart_vars.svs:
      if sum([bool(ext.svs4place(state, p, [sv]).exist_svs) for p in places
             ]) > 1:
        exist_svs.append(sv)
    if not exist_svs:
      state.uttr.counters.err('comparison_failed_varexistence', 1)
      return False
    # Pick places that exist for at least one of these variables.
    exist_places = []
    for p in places:
      if ext.svs4place(state, p, exist_svs).exist_svs:
        exist_places.append(p)
    if len(exist_places) <= 1:
      state.uttr.counters.err('comparison_failed_placeexistence', 1)
      return False

    info_msg = _get_info_message(exist_places, places)
    places = exist_places
    chart_vars.svs = exist_svs
    sv_place_latest_date = ext.get_sv_place_latest_date(exist_svs, places, None,
                                                        state.exist_checks)
    found |= add_chart_to_utterance(ChartType.BAR_CHART,
                                    state,
                                    chart_vars,
                                    places,
                                    chart_origin,
                                    info_message=info_msg,
                                    sv_place_latest_date=sv_place_latest_date)

  if not found:
    state.uttr.counters.err('failed_comparison_existence', '')
    return False

  # If this is the top result, add to answer place.
  if rank == 0 and places:
    ans_places = copy.deepcopy(get_max_ans_places(places, state.uttr))
    state.uttr.answerPlaces = ans_places
    state.uttr.counters.info('comparison_answer_places',
                             [p.dcid for p in ans_places])
  return True
