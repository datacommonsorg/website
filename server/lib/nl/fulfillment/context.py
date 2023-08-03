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
    if len(prev.places) > 1:
      # This was a comparison query, so we don't want
      # to use just one place. Bail at this point.
      break
    for place in prev.places:
      ans.append(place)
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return ans


def has_sv_in_context(uttr: Utterance) -> bool:
  if not uttr:
    return False

  if uttr.prev_utterance and uttr.prev_utterance.insight_ctx:
    if uttr.prev_utterance.insight_ctx.get('variables'):
      return True
    else:
      return False

  svs_list = svs_from_context(uttr, include_uttr=True)
  for svs in svs_list:
    if svs:
      return True
  return False


def has_place_in_context(uttr: Utterance) -> bool:
  if not uttr:
    return False

  # For insight flow.
  if uttr.prev_utterance and uttr.prev_utterance.insight_ctx:
    if uttr.prev_utterance.insight_ctx.get('entities'):
      return True
    else:
      return False

  places = places_from_context(uttr, include_uttr=True)
  for place in places:
    if place.dcid:
      return True
  return False


# Computes a list of places for comparison from the most recent previous context.
def most_recent_places_from_context(uttr: Utterance) -> List[Place]:
  prev_uttr_count = 0
  prev = uttr.prev_utterance
  while (prev and prev_uttr_count < CTX_LOOKBACK_LIMIT):
    if prev.places:
      return prev.places
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return []


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
def get_session_info(context_history: List[Dict], has_data: bool) -> Dict:
  session_info = {'items': []}
  # The first entry in context_history is the most recent.
  # Reverse the order for session_info.
  for i in range(len(context_history)):
    u = context_history[len(context_history) - 1 - i]
    if 'id' not in session_info:
      session_info['id'] = u['session_id']
    if has_data:
      s = constants.QUERY_OK
    else:
      s = constants.QUERY_FAILED
    session_info['items'].append({
        'query': u.get('query', ''),
        'insightCtx': u.get('insightCtx', {}),
        'status': s,
    })
  return session_info
