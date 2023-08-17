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

from server.lib.nl.common import utils
from server.lib.nl.common.topic import open_top_topics_ordered
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection import utils as detection_utils
from server.lib.nl.detection.types import ContainedInClassificationAttributes
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.base import add_chart_to_utterance
from server.lib.nl.fulfillment.base import handle_contained_in_type
from server.lib.nl.fulfillment.context import \
    classifications_of_type_from_utterance
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
import shared.lib.detected_variables as vars

_MAX_MAIN_SVS = 5

#
# Handler for CORRELATION chart.  This does not use the populate_charts() logic
# because it is sufficiently different, requiring identifying pairs of SVs.
#


def populate(uttr: Utterance) -> bool:
  place_type = utils.get_contained_in_type(uttr)
  if place_type:
    if _populate_correlation_for_place_type(
        PopulateState(uttr=uttr, main_cb=None, place_type=place_type)):
      return True
    else:
      uttr.counters.err('correlation_failed_populate_placestype',
                        place_type.value)
  return False


def _populate_correlation_for_place_type(state: PopulateState) -> bool:
  for pl in state.uttr.places:
    if (_populate_correlation_for_place(state, pl)):
      return True
    else:
      state.uttr.counters.err('correlation_failed_populate_main_place', pl.dcid)
  return False


def _populate_correlation_for_place(state: PopulateState, place: Place) -> bool:
  if not handle_contained_in_type(state, [place]):
    # counter updated in handle_contained_in_type
    return False

  # Get child place samples for existence check.
  places_to_check = utils.get_sample_child_places(place.dcid,
                                                  state.place_type.value,
                                                  state.uttr.counters)
  if not places_to_check:
    # Counter updated in get_sample_child_places
    return False

  # When multi-sv has a higher score than single-sv prefer that.
  # See discussion in _route_comparison_or_correlation().
  lhs_svs, rhs_svs = _handle_multi_sv_in_uttr(state.uttr, places_to_check)

  if not lhs_svs or not rhs_svs:
    return False

  found = False
  for lhs_sv in lhs_svs:
    for rhs_sv in rhs_svs:
      if lhs_sv == rhs_sv:
        continue
      found |= _populate_correlation_chart(state, place, lhs_sv, rhs_sv)
  return found


def _handle_multi_sv_in_uttr(uttr: Utterance,
                             places_to_check: List[str]) -> tuple:
  parts = detection_utils.get_multi_sv_pair(uttr.detection)
  if not parts:
    return (None, None)

  final_svs: List[List[str]] = []
  for i, p in enumerate(parts):
    svs = open_top_topics_ordered(p.svs, uttr.counters)
    svs, _ = utils.sv_existence_for_places(places_to_check, svs, uttr.counters)
    if not svs:
      uttr.counters.err(f'multisv_correlation_failed_existence_check_{i}_sv',
                        svs)
      uttr.counters.err(f'multisv_correlation_failed_missing_{i}_sv', 1)
      return (None, None)
    final_svs.append(svs)

  lhs_svs = final_svs[0][:_MAX_MAIN_SVS]
  rhs_svs = final_svs[1][:_MAX_MAIN_SVS]
  uttr.counters.info(f'multisv_correlation_lhs_svs', lhs_svs)
  uttr.counters.info(f'multisv_correlation_rhs_svs', rhs_svs)
  return (lhs_svs, rhs_svs)


def _populate_correlation_chart(state: PopulateState, place: Place, sv_1: str,
                                sv_2: str) -> bool:
  state.block_id += 1
  # TODO: Handle per-capita carefully.
  chart_vars = ChartVars(svs=[sv_1, sv_2],
                         block_id=state.block_id,
                         include_percapita=False,
                         response_type="scatter chart")
  return add_chart_to_utterance(ChartType.SCATTER_CHART, state, chart_vars,
                                [place], ChartOriginType.PRIMARY_CHART)
