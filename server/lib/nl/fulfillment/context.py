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

from typing import List

from lib.nl.detection import (ClassificationAttributes, ClassificationType,
                              Place)
from lib.nl.utterance import CTX_LOOKBACK_LIMIT, Utterance

#
# General utilities for retrieving stuff from past context.
# TODO: convert all implementations to consistently loop from passed `uttr`
#       instead of `uttr.prev_utterance`
#


def svs_from_context(uttr: Utterance) -> List[str]:
  ans = []
  prev_uttr_count = 0
  prev = uttr.prev_utterance
  while (prev and prev_uttr_count < CTX_LOOKBACK_LIMIT):
    ans.append(prev.svs)
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return ans


def places_from_context(uttr: Utterance) -> List[Place]:
  ans = []
  prev_uttr_count = 0
  prev = uttr.prev_utterance
  while (prev and prev_uttr_count < CTX_LOOKBACK_LIMIT):
    for place in prev.places:
      ans.append(place)
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return ans


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
          ans.append(second.places + first.places)
        second = second.prev_utterance
        second_uttr_count = second_uttr_count + 1
    elif len(first.places) > 1:
      # Found multiple places in a single utterance.  Use this.
      ans.append(first.places)
    first = first.prev_utterance
    first_uttr_count = first_uttr_count + 1
  return ans


def query_type_from_context(uttr: Utterance) -> List[ClassificationType]:
  # this needs to be made a lot smarter ...
  prev_uttr_count = 0
  prev = uttr.prev_utterance
  while (prev and prev_uttr_count < CTX_LOOKBACK_LIMIT):
    if (not (prev.query_type == ClassificationType.UNKNOWN)):
      return prev.query_type
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return ClassificationType.SIMPLE


def classifications_of_type_from_context(
    uttr: Utterance,
    ctype: ClassificationType) -> List[ClassificationAttributes]:
  result = []
  for cl in uttr.classifications:
    if (cl.type == ctype):
      result.append(cl)
  prev_uttr_count = 0
  prev = uttr.prev_utterance
  while (prev and prev_uttr_count < CTX_LOOKBACK_LIMIT):
    for cl in prev.classifications:
      if (cl.type == ctype):
        result.append(cl)
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return result
