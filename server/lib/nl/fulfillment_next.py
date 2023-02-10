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
"""Module for NL page data spec"""

import logging
from typing import List

from server.lib.nl import utils
from server.lib.nl.detection import ClassificationType
from server.lib.nl.detection import Detection
from server.lib.nl.detection import NLClassifier
from server.lib.nl.fulfillment import comparison
from server.lib.nl.fulfillment import containedin
from server.lib.nl.fulfillment import context
from server.lib.nl.fulfillment import correlation
from server.lib.nl.fulfillment import event
from server.lib.nl.fulfillment import overview
from server.lib.nl.fulfillment import ranking_across_places
from server.lib.nl.fulfillment import ranking_across_vars
from server.lib.nl.fulfillment import simple
from server.lib.nl.fulfillment import time_delta
from server.lib.nl.utterance import QueryType
from server.lib.nl.utterance import Utterance

# We will ignore SV detections that are below this threshold
_SV_THRESHOLD = 0.5

QUERY_TYPE_HANDLERS = {
    QueryType.SIMPLE: simple,
    QueryType.COMPARISON: comparison,
    QueryType.CONTAINED_IN: containedin,
    QueryType.RANKING_ACROSS_VARS: ranking_across_vars,
    QueryType.RANKING_ACROSS_PLACES: ranking_across_places,
    QueryType.CORRELATION: correlation,
    QueryType.TIME_DELTA: time_delta,
    QueryType.EVENT: event,
    QueryType.OVERVIEW: overview,
}

# The supported rankings in order. Later entry is preferred.
RANKED_QUERY_TYPES = [
    QueryType.SIMPLE,
    QueryType.COMPARISON,
    QueryType.CONTAINED_IN,
    QueryType.RANKING_ACROSS_VARS,
    QueryType.RANKING_ACROSS_PLACES,
    QueryType.CORRELATION,
    QueryType.TIME_DELTA,
    QueryType.EVENT,
    QueryType.OVERVIEW,
]

# The ClassificationTypes not in this map rely on additional fields of detection.
DIRECT_CLASSIFICATION_TYPE_TO_QUERY_TYPE = {
    ClassificationType.SIMPLE:
        QueryType.SIMPLE,
    ClassificationType.CONTAINED_IN:
        QueryType.CONTAINED_IN,
    ClassificationType.CORRELATION:
        QueryType.CORRELATION,
    ClassificationType.COMPARISON:
        QueryType.COMPARISON,
    ClassificationType.TIME_DELTA:
        QueryType.TIME_DELTA,
    ClassificationType.EVENT:
        QueryType.EVENT,

    # Unsupported classification-types. Map them to SIMPLE for now.
    # TODO: Handle this better.
    ClassificationType.UNKNOWN:
        QueryType.SIMPLE,
    ClassificationType.OTHER:
        QueryType.SIMPLE,
    ClassificationType.TEMPORAL:
        QueryType.SIMPLE,
    ClassificationType.CLUSTERING:
        QueryType.SIMPLE,
}

DIRECT_QUERY_TYPE_FALLBACK = {
    # No fallback
    QueryType.OVERVIEW: None,
    QueryType.SIMPLE: QueryType.OVERVIEW,
    QueryType.EVENT: QueryType.SIMPLE,
    QueryType.CONTAINED_IN: QueryType.SIMPLE,
    QueryType.RANKING_ACROSS_VARS: QueryType.SIMPLE,
    QueryType.RANKING_ACROSS_PLACES: QueryType.CONTAINED_IN,
    QueryType.TIME_DELTA: QueryType.CONTAINED_IN,
}


#
# Compute a new Utterance given the classifications for a user query
# and past utterances.
#
def fulfill(query_detection: Detection,
            currentUtterance: Utterance) -> Utterance:

  filtered_svs = filter_svs(query_detection.svs_detected.sv_dcids,
                            query_detection.svs_detected.sv_scores)

  # Construct Utterance datastructure.
  uttr = Utterance(prev_utterance=currentUtterance,
                   query=query_detection.original_query,
                   query_type=ClassificationType.UNKNOWN,
                   detection=query_detection,
                   places=[],
                   classifications=query_detection.classifications,
                   svs=filtered_svs,
                   chartCandidates=[],
                   rankedCharts=[],
                   answerPlaces=[])
  uttr.counters['filtered_svs'] = filtered_svs

  # Add detected places.
  if (query_detection.places_detected):
    uttr.places.append(query_detection.places_detected.main_place)

  query_types = [first_query_type(uttr)]
  while query_types[-1] != None:
    if fulfill_query_type(uttr, query_types[-1]):
      break
    query_types.append(next_query_type(query_types))

  rank_charts(uttr)
  return uttr


def fulfill_query_type(uttr: Utterance, query_type: QueryType) -> bool:
  logging.info('Handled query_type: %d', uttr.query_type.value)
  # Reset previous state
  uttr.query_type = query_type
  uttr.chartCandidates = []

  # If we could not detect query_type from user-query, infer from past context.
  if (uttr.query_type == QueryType.UNKNOWN):
    uttr.query_type = context.query_type_from_context(uttr)

  found = False

  # Each query-type has its own handler. Each knows what arguments it needs and
  # will call on the *_from_context() routines to obtain missing arguments.
  handler = QUERY_TYPE_HANDLERS.get(query_type, None)
  if handler:
    found = handler.populate(uttr)
    utils.update_counter(uttr.counters, 'processed_fulfillment_types',
                         handler.__name__.split('.')[-1])

  return found


# The first query_type to try for the given utterance.  If there are multiple
# classifications, we pick from among them.
def first_query_type(uttr: Utterance):
  query_types = [QueryType.SIMPLE]
  for cl in uttr.classifications:
    query_types.append(_classification_to_query_type(cl, uttr))

  query_types = sorted(query_types, key=(lambda q: RANKED_QUERY_TYPES.index(q)))
  if query_types:
    return query_types[-1]
  return None


# Given the list of previous query_types, decides the next query_type to fallback to.
def next_query_type(query_types: List[QueryType]) -> QueryType:

  next = None
  prev = query_types[-1]
  if prev in DIRECT_QUERY_TYPE_FALLBACK:
    next = DIRECT_QUERY_TYPE_FALLBACK[prev]
  elif prev == QueryType.COMPARISON:
    if QueryType.CORRELATION not in query_types:
      next = QueryType.CORRELATION
    else:
      next = QueryType.CONTAINED_IN
  elif prev == QueryType.CORRELATION:
    if QueryType.COMPARISON not in query_types:
      next = QueryType.COMPARISON
    else:
      next = QueryType.CONTAINED_IN
  return next


def _classification_to_query_type(cl: NLClassifier,
                                  uttr: Utterance) -> QueryType:
  if cl.type in DIRECT_CLASSIFICATION_TYPE_TO_QUERY_TYPE:
    query_type = DIRECT_CLASSIFICATION_TYPE_TO_QUERY_TYPE[cl.type]
  elif cl.type == ClassificationType.OVERVIEW:
    if not uttr.svs:
      # We detected some overview words ("tell me about") *and* there were
      # no SVs in current utterance, so consider it a place overview.
      query_type = QueryType.OVERVIEW
    else:
      query_type = QueryType.SIMPLE
  elif cl.type == ClassificationType.RANKING:
    current_contained_classification = context.classifications_of_type_from_utterance(
        uttr, ClassificationType.CONTAINED_IN)
    if current_contained_classification:
      query_type = QueryType.RANKING_ACROSS_PLACES
    else:
      query_type = QueryType.RANKING_ACROSS_VARS
  else:
    query_type = None

  return query_type


#
# Rank candidate charts in the given Utterance.
#
# TODO: Maybe improve in future.
def rank_charts(utterance: Utterance):
  for chart in utterance.chartCandidates:
    logging.info("Chart: %s %s\n" % (chart.places, chart.svs))
  utterance.rankedCharts = utterance.chartCandidates


#
# Filter out SVs that are below a score.
#
def filter_svs(sv_list: List[str], sv_score: List[float]) -> List[str]:
  # this functionality should be moved to detection.
  i = 0
  ans = []
  while (i < len(sv_list)):
    if (sv_score[i] >= _SV_THRESHOLD):
      ans.append(sv_list[i])
    i = i + 1
  return ans
