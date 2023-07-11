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

from typing import Dict, List

from server.lib.nl.common import constants
from server.lib.nl.common.utterance import CTX_LOOKBACK_LIMIT
from server.lib.nl.common.utterance import QueryType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import Place

#
# General utilities for retrieving stuff from past context.
# TODO: convert all implementations to consistently loop from passed `uttr`
#       instead of `uttr.prev_utterance`
#


def svs_from_context(uttr: Utterance, include_uttr: bool = False) -> List[str]:
  ans = []
  if include_uttr:
    ans.append(uttr.svs)
  prev_uttr_count = 0
  prev = uttr.prev_utterance
  while (prev and prev_uttr_count < CTX_LOOKBACK_LIMIT):
    ans.append(prev.svs)
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return ans


def places_from_context(uttr: Utterance,
                        include_uttr: bool = False) -> List[Place]:
  ans = []
  if include_uttr:
    ans.extend(uttr.places)
  prev_uttr_count = 0
  prev = uttr.prev_utterance
  while (prev and prev_uttr_count < CTX_LOOKBACK_LIMIT):
    if uttr.place_fallback:
      # Always use the user-provided original place
      # if there was past fallback.
      ans.append(uttr.place_fallback.origPlace)
    else:
      for place in prev.places:
        ans.append(place)
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return ans


def has_sv_in_context(uttr: Utterance) -> bool:
  if not uttr:
    return False
  svs_list = svs_from_context(uttr, include_uttr=True)
  for svs in svs_list:
    if svs:
      return True
  return False


def has_place_in_context(uttr: Utterance) -> bool:
  if not uttr:
    return False
  places = places_from_context(uttr, include_uttr=True)
  for place in places:
    if place.dcid:
      return True
  return False


# Computes a list of place lists, where each inner list is a candidate for place
# comparison.  The outer list is ordered from most prefered candidates to least.
#
# The logic for determining a single place comparison candidate is as follows:
# 1. If an utterance has multiple places, then that is a candidate list.
# 2. If an utterance has a single place, then we walk up prior utterances until
#    we find an utterance with at least one place.  The candidate list is
#    the former single place plus the latter from prior utterance.
#
# For example, suppose the query sequence is as follows:
#   [tell me about san jose] -> [how is auto theft in fremont] -> [compare with palo alto]
#
# In this case, the ordered candidates will be:
#   [[palo alto, fremont], [palo alto, san jose], [fremont, san jose]]
#
# If instead of the last query, we had:
#  [compare among palo alto, sunnyvale and san jose]
# Then, the ordered candidates will be:
#  [[palo alto, sunnyvale, san jose], [fremont, san jose]]
#
def places_for_comparison_from_context(uttr: Utterance) -> List[List[Place]]:
  ans = []
  first_uttr_count = 0
  first = uttr
  while (first and first_uttr_count < CTX_LOOKBACK_LIMIT + 1):
    if len(first.places) == 1:
      # Found only one place.  Try to find related place by looping up
      # the utterance chain.
      second = first.prev_utterance
      second_uttr_count = first_uttr_count + 1
      while (second and second_uttr_count < CTX_LOOKBACK_LIMIT + 1):
        # For the first place, add all combinations of the second.
        if second.places:
          combined_places = _combine_places(second.places, first.places)
          if len(combined_places) > 1:
            ans.append(combined_places)
        second = second.prev_utterance
        second_uttr_count = second_uttr_count + 1
    elif len(first.places) > 1:
      # Found multiple places in a single utterance.  Use this.
      ans.append(first.places)
    first = first.prev_utterance
    first_uttr_count = first_uttr_count + 1
  return ans


def _combine_places(l1: List[Place], l2: List[Place]) -> List[Place]:
  dcids = set([p.dcid for p in l1])
  return l1 + [p for p in l2 if p.dcid not in dcids]


def query_type_from_context(uttr: Utterance) -> List[QueryType]:
  # this needs to be made a lot smarter ...
  prev_uttr_count = 0
  prev = uttr.prev_utterance
  while (prev and prev_uttr_count < CTX_LOOKBACK_LIMIT):
    if (not (prev.query_type == QueryType.UNKNOWN)):
      return prev.query_type
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return QueryType.SIMPLE


def classifications_of_type_from_context(
    uttr: Utterance, ctype: ClassificationType) -> List[NLClassifier]:
  result = []
  result.extend(classifications_of_type_from_utterance(uttr, ctype))
  prev_uttr_count = 0
  prev = uttr.prev_utterance
  while (prev and prev_uttr_count < CTX_LOOKBACK_LIMIT):
    result.extend(classifications_of_type_from_utterance(prev, ctype))
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return result


def classifications_of_type_from_utterance(
    uttr: Utterance, ctype: ClassificationType) -> List[NLClassifier]:
  return [cl for cl in uttr.classifications if cl.type == ctype]


def classifications_of_type(classifications: List[NLClassifier],
                            ctype: ClassificationType) -> List[NLClassifier]:
  return [cl for cl in classifications if cl.type == ctype]


# `context_history` contains utterances in a given session.
def get_session_info(context_history: List[Dict]) -> Dict:
  session_info = {'items': []}
  # The first entry in context_history is the most recent.
  # Reverse the order for session_info.
  for i in range(len(context_history)):
    u = context_history[len(context_history) - 1 - i]
    if 'id' not in session_info:
      session_info['id'] = u['session_id']
    if u['ranked_charts']:
      s = constants.QUERY_OK
    else:
      s = constants.QUERY_FAILED
    session_info['items'].append({
        'query': u['query'],
        'status': s,
    })
  return session_info
