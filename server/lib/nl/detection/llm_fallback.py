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
"""Decide whether to fallback to using LLM."""

from typing import List

from server.lib.nl.common import counters
from server.lib.nl.common import utils
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import Detection
import server.lib.nl.detection.utils as dutils
from shared.lib import detected_variables as dvars

_COMPLEX_QUERY_TOKEN_THRESHOLD = 10


#
# Given a heuristic-based Detection, decides whether we need a call to LLM
#
# Here are some examples that should fallback:
# - poverty vs. asthma in california counties
# - Prevalence of Asthma in California cities with hispanic population over 10000
# - Prevalence of Asthma in California cities with the highest hispanic population
#
def need_llm(heuristic: Detection, ctr: counters.Counters) -> bool:
  # 1. If there was no SV.
  if _has_no_sv(heuristic, ctr):

    # For OVERVIEW/SIZE_TYPE/EVENT_TYOE classifications, we don't have SVs,
    # exclude those.
    has_no_sv_classification = any(
        cl.type == ClassificationType.OVERVIEW or cl.type ==
        ClassificationType.SIZE_TYPE or cl.type == ClassificationType.EVENT
        for cl in heuristic.classifications)

    if not has_no_sv_classification:
      ctr.info('info_fallback_no_sv_found', '')
      return True

  # 2. If there was no place.
  if _has_no_place(heuristic):

    # For COUNTRY contained-in type, Earth is assumed
    # (e.g., countries with worst health), so exclude that.
    ptype = utils.get_contained_in_type(heuristic.classifications)

    if ptype != ContainedInPlaceType.COUNTRY:
      ctr.info('info_fallback_no_place_found', '')
      return True

  # 3. Use some heuristics to tell if it is a complex query.
  if _is_complex_query(heuristic, ctr):
    # Callee writes counter.
    return True

  return False


def _has_no_sv(d: Detection, ctr: counters.Counters) -> bool:
  return not dutils.filter_svs(d.svs_detected.single_sv, ctr)


def _has_no_place(d: Detection) -> bool:
  return not d.places_detected or not d.places_detected.places_found


#
# Returns true if the original query is likely a "complex" one with
# multiple SVs.
#
def _is_complex_query(d: Detection, ctr: counters.Counters) -> bool:
  query = d.original_query
  query_places = []
  if d.places_detected:
    query_places = d.places_detected.query_places_mentioned

  # If there is a Quantity detected, that's a good chance this might
  # be a complex query.
  has_quantity = any(
      cl.type == ClassificationType.QUANTITY for cl in d.classifications)
  if has_quantity:
    ctr.info('info_fallback_has_quantity', '')
    return True

  if not dutils.is_multi_sv(d):
    # If its not a multi-SV query, we just assume its not a complex query.
    return False

  # Use the top-multi-sv, whose score exceeds top single-SV.
  multi_sv = d.svs_detected.multi_sv.candidates[0]

  # This may be a multi-sv, but increase that confidence that it
  # is by checking that the top candidate is either delimiter-separated,
  # or is delimited by the place name.

  # TODO: Consider if we should skip this altogether.

  # User had specified a delimiter.  e.g., asthma vs. poverty in ca
  if multi_sv.delim_based:
    disp = ':'.join([p.query_part for p in multi_sv.parts])
    ctr.info('info_fallback_multi_sv_delimiter', disp)
    return True

  # Or if the place name delimits query-parts.
  # e.g., asthma in ca where poverty rules
  if _does_place_delimit_query_parts(query, query_places, multi_sv,
                                     ctr) == 'YES':
    # Callee writes counter.
    return True

  # This could still be a complex query.  e.g., find asthma where poverty is high in ca cities
  #
  # Another useful signal for a complex query is its length.
  #
  # TODO: Consider if we should do this ahead of `is_multi_sv` check.
  n = _num_query_tokens_excluding_places(query, query_places)
  if n > _COMPLEX_QUERY_TOKEN_THRESHOLD:
    ctr.info('info_fallback_query_very_long', n)
    return True

  # TODO:  Add more heuristics.  Perhaps some specific words? (`where`, `with`)

  ctr.info('info_fallback_multi_sv_no_delim', '')
  return False


# Returns 'YES' *if* sv-parts of the `mult_sv` are delimited by a place
# in `places_mentioned`.  If the sv or place sub-string cannot be found
# in the query, returns 'UNSURE'.
def _does_place_delimit_query_parts(query: str, places_mentioned: List[str],
                                    multi_sv: dvars.MultiVarCandidate,
                                    ctr: counters.Counters) -> str:
  # Find all sv sub-part indexes.
  vidx_list = []
  for p in multi_sv.parts:
    vidx = query.find(p.query_part)
    if vidx == -1:
      ctr.err('failed_fallback_svidxmissing', p.query_part)
      return 'UNSURE'
    vidx_list.append(vidx)

  for place in places_mentioned:
    # Find place idx.
    pidx = query.find(place)
    if pidx == -1:
      ctr.err('failed_fallback_placeidxmissing', place)
      return 'UNSURE'

    # If pidx appears in-between vidx_list indexes, then return true.
    prev = -1
    for i, cur in enumerate(vidx_list):
      if prev != -1 and pidx > prev and pidx < cur:
        disp = ':'.join([
            multi_sv.parts[i - 1].query_part, place,
            multi_sv.parts[i].query_part
        ])
        ctr.info('info_fallback_place_within_multi_sv', disp)
        return 'YES'
      prev = cur

  return 'NO'


def _num_query_tokens_excluding_places(query: str,
                                       places_mentioned: List[str]) -> int:
  tmp_query = query
  for place in places_mentioned:
    tmp_query = tmp_query.replace(place, '')
  # Split ignores empties.
  return len(tmp_query.split())
