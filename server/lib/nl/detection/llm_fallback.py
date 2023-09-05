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

from enum import Enum
from typing import List

from server.lib.nl.common import counters
from server.lib.nl.common import utils
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import Detection
import server.lib.nl.detection.utils as dutils
import server.lib.nl.fulfillment.utils as futils
from shared.lib import constants as sh_constants
from shared.lib import detected_variables as dvars
from shared.lib import utils as sh_utils


class NeedLLM(Enum):
  No = 1
  ForPlace = 2
  ForVar = 3
  ForSafety = 4
  Fully = 5


# Any score below this value does not qualify for fallback. This
# gives us confidence that the multi-var is indeed made up of
# multiple independent variables.
MULTIVAR_HIGH_THRESHOLD_SCORE = 0.9


#
# Given a heuristic-based Detection, decides whether we need a call to LLM
#
# Here are some examples that should fallback:
#
# - Prevalence of Asthma in counties of California with hispanic population over 10000
#   => Because we have detected 2 SVs, and its not correlation/comparison.
# - Prevalence of Asthma in counties of California with the highest hispanic population
#   => Because we have detected 2 SVs, and its not correlation/comparison.
# - Number of shakespeare fans in california
#   => Because we would not have detected any SV, SUPERLATIVE, OVERVIEW, EVENT
# - Asthma where Obama was born
#   => Because we would not have detected a Place.
#
def need_llm(heuristic: Detection, prev_uttr: Utterance,
             ctr: counters.Counters) -> NeedLLM:
  need_sv = False
  need_place = False

  # 1. If there was no SV.
  if _has_no_sv(heuristic, ctr):

    # For OVERVIEW/SUPERLATIVE/EVENT_TYPE classifications, we don't have SVs,
    # exclude those.
    has_sv_classification = any(
        cl.type == ClassificationType.OVERVIEW or cl.type ==
        ClassificationType.SUPERLATIVE or cl.type == ClassificationType.EVENT
        for cl in heuristic.classifications)

    # Does the query have more words beyond place names?
    has_more_words = bool(heuristic.places_detected.query_without_place_substr)

    # Check if the context had SVs.
    if not has_sv_classification and not futils.has_sv(
        prev_uttr) and has_more_words:
      ctr.info('info_fallback_no_sv_found', '')
      need_sv = True

  # 2. If there was no place.
  if _has_no_place(heuristic):

    # For COUNTRY contained-in type, Earth is assumed
    # (e.g., countries with worst health), so exclude that.
    #
    # Also confirm there was no place in the context.
    ptype = utils.get_contained_in_type(heuristic.classifications)
    if ptype != ContainedInPlaceType.COUNTRY and not futils.has_place(
        prev_uttr):
      ctr.info('info_fallback_no_place_found', '')
      need_place = True

  # 3. Use some heuristics to tell if it is a complex query.
  if _is_complex_query(heuristic, ctr):
    # Callee writes counter.
    need_sv = True

  llm_type = NeedLLM.No
  if need_sv and need_place:
    llm_type = NeedLLM.Fully
  elif need_sv:
    llm_type = NeedLLM.ForVar
  elif need_place:
    llm_type = NeedLLM.ForPlace

  return llm_type


def _has_no_sv(d: Detection, ctr: counters.Counters) -> bool:
  return not dutils.filter_svs(d.svs_detected.single_sv, ctr)


def _has_no_place(d: Detection) -> bool:
  return not d.places_detected or not d.places_detected.places_found


#
# Returns true if the original query is likely a "complex" one with
# multiple SVs.
#
def _is_complex_query(d: Detection, ctr: counters.Counters) -> bool:
  query_places = []
  if d.places_detected:
    query_places = d.places_detected.query_places_mentioned

  # If its not a multi-SV query, it is not a complex query.
  if not dutils.is_multi_sv(d):
    return False

  # Use the top-multi-sv, whose score exceeds top single-SV.
  multi_sv = d.svs_detected.multi_sv.candidates[0]

  # Ensure that the top candidate has a much higher threshold.
  if not _do_high_threshold_check(multi_sv):
    ctr.info('info_fallback_below_high_threshold', '')
    return False

  # If there are ~2 SVs, and we have detected comparison/correlation,
  # we would handle it better ourselves.
  if dutils.get_multi_sv_pair(d) and any(
      cl.type == ClassificationType.COMPARISON or
      cl.type == ClassificationType.CORRELATION for cl in d.classifications):
    ctr.info('info_fallback_dual_sv_correlation', '')
    return False

  # Increase confidence that it is a multi-sv case by checking that the top
  # candidate is either delimiter-separated, or is delimited
  # by the place name.
  if not _is_multi_sv_delimited(d, query_places, multi_sv, ctr):
    return False

  return True


def _do_high_threshold_check(multi_sv: dvars.MultiVarCandidate) -> bool:
  for p in multi_sv.parts:
    if not p.scores or p.scores[0] < MULTIVAR_HIGH_THRESHOLD_SCORE:
      return False
  # Every SV part's score was >= the high-threshold, so return true.
  return True


#
# Returns 'YES' *if* sv-parts of the `mult_sv` are delimited by a
# delimiter or a place in `places_mentioned`.
#
# If the sv or place sub-string cannot be found in the query, returns 'UNSURE'.
#
# Examples:
# - poverty vs. income in california
#   => True (delimited by "vs")
# - poverty in california cities where income is highest
#   => True (delimited by place)
# - poverty in highest income california cities
#   => False (not delimited)
# - asthma prevalence in california counties where income is highest
#   => False *if* we suppose the query_parts detected are:
#      [asthma prevalence counties] and [income]
#
def _is_multi_sv_delimited(d: Detection, places_mentioned: List[str],
                           multi_sv: dvars.MultiVarCandidate,
                           ctr: counters.Counters) -> bool:
  # User had specified a delimiter.  e.g., asthma vs. poverty in ca
  if multi_sv.delim_based:
    disp = ':'.join([p.query_part for p in multi_sv.parts])
    ctr.info('info_fallback_multi_sv_delimiter', disp)
    return True

  # Note: since the `query_part` has stop words removed, remove
  # them and look for delimiters.
  query = sh_utils.remove_stop_words(d.cleaned_query, sh_constants.STOP_WORDS)

  # Find all sv sub-part indexes.
  vidx_list = []
  for p in multi_sv.parts:
    vidx = query.find(p.query_part)
    if vidx == -1:
      ctr.err('failed_fallback_svidxmissing', p.query_part)
      return False
    vidx_list.append(vidx)

  for place in places_mentioned:
    # Find place idx.
    pidx = query.find(place)
    if pidx == -1:
      ctr.err('failed_fallback_placeidxmissing', place)
      return False

    # If pidx appears in-between vidx_list indexes, then return true.
    prev = -1
    for i, cur in enumerate(vidx_list):
      if prev != -1 and pidx > prev and pidx < cur:
        disp = ':'.join([
            multi_sv.parts[i - 1].query_part, place,
            multi_sv.parts[i].query_part
        ])
        ctr.info('info_fallback_place_within_multi_sv', disp)
        return True
      prev = cur

  ctr.info('info_fallback_multi_sv_no_delim', '')
  return False
