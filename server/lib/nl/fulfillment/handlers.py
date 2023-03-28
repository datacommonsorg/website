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
"""Module for representing all fulfillment handlers."""

from dataclasses import dataclass
from typing import List

from server.lib.nl.detection import ClassificationType
from server.lib.nl.detection import ContainedInClassificationAttributes
from server.lib.nl.detection import ContainedInPlaceType
from server.lib.nl.detection import NLClassifier
from server.lib.nl.detection import Place
from server.lib.nl.fulfillment import comparison
from server.lib.nl.fulfillment import containedin
from server.lib.nl.fulfillment import context
from server.lib.nl.fulfillment import correlation
from server.lib.nl.fulfillment import event
from server.lib.nl.fulfillment import overview
from server.lib.nl.fulfillment import ranking_across_places
from server.lib.nl.fulfillment import ranking_across_vars
from server.lib.nl.fulfillment import simple
from server.lib.nl.fulfillment import size_across_entities
from server.lib.nl.fulfillment import time_delta_across_places
from server.lib.nl.fulfillment import time_delta_across_vars
from server.lib.nl.utterance import QueryType
from server.lib.nl.utterance import Utterance


# Represents a query type handler.
@dataclass
class QueryHandlerConfig:
  module: any
  # Higher is better.
  rank: int
  # Fallback candidate if set. If not set, there custom
  # logic to decide on the fallback, coded in next_query_type().
  # Note: If there is no fallback, direct_fallback matches the QueryType.
  direct_fallback: QueryType = None


QUERY_HANDLERS = {
    QueryType.SIMPLE:
        QueryHandlerConfig(module=simple,
                           rank=1,
                           direct_fallback=QueryType.OVERVIEW),

    # Comparison has a more complex fallback logic captured in next_query_type().
    QueryType.COMPARISON:
        QueryHandlerConfig(module=comparison, rank=2),
    QueryType.CONTAINED_IN:
        QueryHandlerConfig(module=containedin,
                           rank=3,
                           direct_fallback=QueryType.SIMPLE),
    QueryType.RANKING_ACROSS_VARS:
        QueryHandlerConfig(module=ranking_across_vars,
                           rank=4,
                           direct_fallback=QueryType.SIMPLE),
    QueryType.RANKING_ACROSS_PLACES:
        QueryHandlerConfig(module=ranking_across_places,
                           rank=5,
                           direct_fallback=QueryType.CONTAINED_IN),

    # Correlation has a more complex fallback logic captured in next_query_type().
    QueryType.CORRELATION:
        QueryHandlerConfig(module=correlation, rank=6),
    QueryType.TIME_DELTA_ACROSS_VARS:
        QueryHandlerConfig(module=time_delta_across_vars,
                           rank=7,
                           direct_fallback=QueryType.SIMPLE),
    QueryType.TIME_DELTA_ACROSS_PLACES:
        QueryHandlerConfig(module=time_delta_across_places,
                           rank=8,
                           direct_fallback=QueryType.CONTAINED_IN),
    QueryType.EVENT:
        QueryHandlerConfig(module=event,
                           rank=9,
                           direct_fallback=QueryType.SIMPLE),
    QueryType.SIZE_ACROSS_ENTITIES:
        QueryHandlerConfig(module=size_across_entities,
                           rank=10,
                           direct_fallback=QueryType.CONTAINED_IN),

    # Overview trumps everything else ("tell us about"), and
    # has no fallback.
    QueryType.OVERVIEW:
        QueryHandlerConfig(module=overview,
                           rank=11,
                           direct_fallback=QueryType.OVERVIEW),
}

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
    ClassificationType.EVENT:
        QueryType.EVENT,
    ClassificationType.SIZE_TYPE:
        QueryType.SIZE_ACROSS_ENTITIES,

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


# The first query_type to try for the given utterance.  If there are multiple
# classifications, we pick from among them.
def first_query_type(uttr: Utterance):
  query_types = [QueryType.SIMPLE]
  for cl in uttr.classifications:
    qtype = _classification_to_query_type(cl, uttr)
    if qtype != None:
      query_types.append(qtype)

  default_config = QueryHandlerConfig(module=None, rank=-1)  # Ranks the lowest
  query_types = sorted(
      query_types, key=(lambda q: QUERY_HANDLERS.get(q, default_config).rank))
  if query_types:
    _maybe_promote_simple_to_containedin(uttr, query_types)
    return query_types[-1]
  return None


def _maybe_promote_simple_to_containedin(uttr: Utterance,
                                         query_types: List[QueryType]):
  if not _should_promote_simple_to_containedin(query_types[-1], uttr.places):
    return
  uttr.classifications.append(
      NLClassifier(type=ClassificationType.CONTAINED_IN,
                   attributes=ContainedInClassificationAttributes(
                       contained_in_place_type=ContainedInPlaceType.ACROSS)))
  if QueryType.CONTAINED_IN in query_types:
    query_types.remove(QueryType.CONTAINED_IN)
  query_types[-1] = QueryType.CONTAINED_IN


def _should_promote_simple_to_containedin(query_type: QueryType,
                                          places: List[Place]) -> bool:
  return (query_type == QueryType.SIMPLE and len(places) == 1 and
          (places[0].place_type == 'Continent' or places[0].dcid == 'Earth'))


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
    classification = context.classifications_of_type_from_utterance(
        uttr, ClassificationType.CONTAINED_IN)
    if classification:
      query_type = QueryType.RANKING_ACROSS_PLACES
    else:
      query_type = QueryType.RANKING_ACROSS_VARS
  elif cl.type == ClassificationType.TIME_DELTA:
    classification = context.classifications_of_type_from_utterance(
        uttr, ClassificationType.CONTAINED_IN)
    if classification:
      query_type = QueryType.TIME_DELTA_ACROSS_PLACES
    else:
      query_type = QueryType.TIME_DELTA_ACROSS_VARS
  else:
    query_type = None

  return query_type


# Given the list of previous query_types, decides the next query_type to fallback to.
def next_query_type(query_types: List[QueryType]) -> QueryType:
  next_type = None
  prev_type = query_types[-1]
  config = QUERY_HANDLERS.get(prev_type, None)
  if not config:
    return None

  if prev_type == config.direct_fallback:
    # No fallback
    next_type = None
  elif config.direct_fallback != None:
    next_type = config.direct_fallback
  elif prev_type == QueryType.COMPARISON:
    if QueryType.CORRELATION not in query_types:
      next_type = QueryType.CORRELATION
    else:
      next_type = QueryType.CONTAINED_IN
  elif prev_type == QueryType.CORRELATION:
    if QueryType.COMPARISON not in query_types:
      next_type = QueryType.COMPARISON
    else:
      next_type = QueryType.CONTAINED_IN

  return next_type
