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
"""Query related helpers"""

from dataclasses import dataclass
import itertools
import logging
import re
from typing import List

from shared.lib import constants
from shared.lib import utils

# TODO: decouple words removal from detected attributes. Today, the removal
# blanket removes anything that matches, including the various attribute/
# classification triggers and contained_in place types (and their plurals).
# This may not always be the best thing to do.
ALL_STOP_WORDS = utils.combine_stop_words()

_MAX_SVS = 4

# Use comma, "vs.", semi-colon, "and", ampersand as delimiters.
_REGEX_DELIMITERS = r',|vs|;|and|&'
# Regex to extract out substrings within double quotes.
_REGEX_QUOTED_STRING = r'"([^"]+)"'


# A specific way a query has been split.
@dataclass
class QuerySplit:
  # Parts of a query
  parts: List[str]


# Different combinations of splits for a given nsplits.
@dataclass
class QuerySet:
  # The number of splits
  nsplits: int
  # Was it based on delimiter?
  delim_based: bool
  # Different combinations of a query
  combinations: List[QuerySplit]


#
# This returns multiple combinations of |nsplits| query-lets, represented
# as a list of lists.
#
def _prepare_queryset(nsplits: int, query_parts: List[str]) -> QuerySet:
  result = QuerySet(nsplits=nsplits, delim_based=False, combinations=[])

  assert nsplits >= 2
  assert nsplits <= len(query_parts)
  #
  # For M nsplits on N query_parts, we compute different
  # combinations each of which is a (M-1) array of
  # "split index" with values ranging from 0 to (N-2).
  # The split-index is the last index of a sequence of words.
  #
  # For e.g., for 3 nsplits of "hispanic poor male population",
  # we do combinations(range(3), 2) which gives
  # [(0,1), (0,2), (1,2)], which refers to 3 QuerySplits:
  #    ['hispanic', 'poor', 'male population']
  #    ['hispanic', 'poor male', 'population']
  #    ['hispanic poor', 'male', 'population']
  #
  split_index_combos = itertools.combinations(range(len(query_parts) - 1),
                                              nsplits - 1)
  for split_index in split_index_combos:
    qs = QuerySplit(parts=[])
    start = 0
    for last in split_index:
      qs.parts.append(' '.join(query_parts[start:last + 1]))
      start = last + 1
    qs.parts.append(' '.join(query_parts[start:]))
    result.combinations.append(qs)
  return result


#
# Given a query return its parts based on delimiters.
#
def get_parts_via_delimiters(query):
  parts = re.findall(_REGEX_QUOTED_STRING, query)
  if parts:
    return parts

  parts = []
  for part in re.split(_REGEX_DELIMITERS, query):
    if part.strip():
      parts.append(part.strip())
  return parts


def _prepare_queryset_via_delimiters(query: str,
                                     querysets: List[QuerySet]) -> int:
  parts = get_parts_via_delimiters(query)
  if len(parts) == 1:
    return 0
  cleaned_parts = []
  for p in parts:
    p = utils.remove_stop_words(utils.remove_punctuations(p),
                                constants.STOP_WORDS)
    if p:
      cleaned_parts.append(p)
  if not cleaned_parts:
    return 0

  logging.info(f'{query} -> delimiter parts {cleaned_parts}')
  querysets.append(
      QuerySet(nsplits=len(cleaned_parts),
               delim_based=True,
               combinations=[QuerySplit(parts=cleaned_parts)]))
  return len(cleaned_parts)


#
# Returns combinations of |query| string parts of upto _MAX_SVS splits.
#
def prepare_multivar_querysets(query: str) -> List[QuerySet]:
  querysets: List[QuerySet] = []

  delim_nsplits = _prepare_queryset_via_delimiters(query, querysets)

  query = utils.remove_punctuations(query)
  query = utils.remove_stop_words(query, constants.STOP_WORDS)

  query_parts = [x.strip() for x in query.split(' ') if x.strip()]
  max_splits = min(_MAX_SVS, len(query_parts))
  for nsplits in range(2, max_splits + 1):
    if delim_nsplits == nsplits:
      continue
    queryset = _prepare_queryset(nsplits, query_parts)
    if queryset.combinations:
      querysets.append(queryset)

  return querysets
