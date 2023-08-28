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

import server.lib.nl.common.utils as cutils
from server.lib.nl.common.utterance import FulfillmentResult
from server.lib.nl.common.utterance import QueryType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection import utils as detection_utils
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import ContainedInClassificationAttributes
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.fulfillment import basic
from server.lib.nl.fulfillment import comparison
from server.lib.nl.fulfillment import correlation
from server.lib.nl.fulfillment import filter_with_dual_vars
from server.lib.nl.fulfillment import filter_with_single_var
from server.lib.nl.fulfillment import size_across_entities
from server.lib.nl.fulfillment import time_delta_across_places
from server.lib.nl.fulfillment import time_delta_across_vars
from server.lib.nl.fulfillment.types import PopulateState
import server.lib.nl.fulfillment.utils as futils


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
    QueryType.BASIC:
        QueryHandlerConfig(module=basic,
                           rank=1,
                           direct_fallback=QueryType.OVERVIEW),
    QueryType.COMPARISON_ACROSS_PLACES:
        QueryHandlerConfig(module=comparison,
                           rank=2,
                           direct_fallback=QueryType.BASIC),
    QueryType.CORRELATION_ACROSS_VARS:
        QueryHandlerConfig(module=correlation,
                           rank=3,
                           direct_fallback=QueryType.BASIC),

    # TODO: Consider falling back to each other since they're quite similar.
    # TODO: When we fallback from TIME_DELTA we should report why to user.
    QueryType.TIME_DELTA_ACROSS_VARS:
        QueryHandlerConfig(module=time_delta_across_vars,
                           rank=4,
                           direct_fallback=QueryType.BASIC),
    QueryType.TIME_DELTA_ACROSS_PLACES:
        QueryHandlerConfig(module=time_delta_across_places,
                           rank=5,
                           direct_fallback=QueryType.COMPARISON_ACROSS_PLACES),
    QueryType.EVENT:
        QueryHandlerConfig(module=None, rank=6,
                           direct_fallback=QueryType.BASIC),
    QueryType.SIZE_ACROSS_ENTITIES:
        QueryHandlerConfig(module=size_across_entities,
                           rank=7,
                           direct_fallback=QueryType.BASIC),
    QueryType.FILTER_WITH_SINGLE_VAR:
        QueryHandlerConfig(module=filter_with_single_var,
                           rank=8,
                           direct_fallback=QueryType.BASIC),
    QueryType.FILTER_WITH_DUAL_VARS:
        QueryHandlerConfig(module=filter_with_dual_vars,
                           rank=9,
                           direct_fallback=QueryType.BASIC),

    # Overview trumps everything else ("tell us about"), and
    # has no fallback.
    QueryType.OVERVIEW:
        QueryHandlerConfig(module=None,
                           rank=100,
                           direct_fallback=QueryType.OVERVIEW),
}


# The first query_type to try for the given utterance.  If there are multiple
# classifications, we pick from among them.
def first_query_type(uttr: Utterance):
  query_types = []
  for cl in uttr.classifications:
    qtype = _classification_to_query_type(cl, uttr)
    if qtype != None and qtype not in query_types:
      query_types.append(qtype)
  if not query_types:
    query_types.append(_maybe_remap_basic(uttr))

  default_config = QueryHandlerConfig(module=None, rank=-1)  # Ranks the lowest
  query_types = sorted(
      query_types, key=(lambda q: QUERY_HANDLERS.get(q, default_config).rank))
  if query_types:
    return query_types[-1]
  return None


def _maybe_remap_basic(uttr: Utterance) -> QueryType:
  remapped_type = QueryType.BASIC
  if (uttr.detection and uttr.detection.places_detected and
      uttr.detection.places_detected.places_found and
      not uttr.detection.places_detected.query_without_place_substr):
    # If there are no words beyond place names, do OVERVIEW
    remapped_type = QueryType.OVERVIEW
  elif len(uttr.places) > 1:
    # Promote to place comparison.
    remapped_type = QueryType.COMPARISON_ACROSS_PLACES
  else:
    _maybe_add_containedin(uttr)
  return remapped_type


def _maybe_add_containedin(uttr: Utterance) -> bool:
  if (len(uttr.places) == 1 and (uttr.places[0].place_type == 'Continent' or
                                 uttr.places[0].dcid == 'Earth') and
      not cutils.get_contained_in_type(uttr)):
    uttr.classifications.append(
        NLClassifier(
            type=ClassificationType.CONTAINED_IN,
            attributes=ContainedInClassificationAttributes(
                contained_in_place_type=ContainedInPlaceType.DEFAULT_TYPE,
                had_default_type=True)))
    return True
  return False


def _classification_to_query_type(cl: NLClassifier,
                                  uttr: Utterance) -> QueryType:
  if cl.type == ClassificationType.CONTAINED_IN:
    query_type = QueryType.BASIC
  elif cl.type == ClassificationType.EVENT:
    query_type = QueryType.EVENT
  elif cl.type == ClassificationType.SIZE_TYPE:
    query_type = QueryType.SIZE_ACROSS_ENTITIES
  elif cl.type == ClassificationType.SIMPLE:
    query_type = QueryType.BASIC
  elif cl.type == ClassificationType.OVERVIEW:
    if uttr.svs and uttr.sv_source == FulfillmentResult.CURRENT_QUERY:
      query_type = QueryType.BASIC
    else:
      # We detected some overview words ("tell me about") *and* there were
      # no SVs in current utterance, so consider it a place overview.
      query_type = QueryType.OVERVIEW
      # Reset the source of SV to the default.
      uttr.sv_source = FulfillmentResult.CURRENT_QUERY
  elif cl.type == ClassificationType.RANKING:
    _maybe_add_containedin(uttr)
    classification = futils.classifications_of_type_from_utterance(
        uttr, ClassificationType.CONTAINED_IN)
    query_type = QueryType.BASIC
  elif cl.type == ClassificationType.TIME_DELTA:
    _maybe_add_containedin(uttr)
    classification = futils.classifications_of_type_from_utterance(
        uttr, ClassificationType.CONTAINED_IN)
    if len(
        uttr.places) > 1 or (classification and
                             not classification[0].attributes.had_default_type):
      # We had multiple places or had place-type that's user-specified.
      query_type = QueryType.TIME_DELTA_ACROSS_PLACES
    else:
      query_type = QueryType.TIME_DELTA_ACROSS_VARS
  elif (cl.type == ClassificationType.COMPARISON or
        cl.type == ClassificationType.CORRELATION):
    query_type = route_comparison_or_correlation(cl.type, uttr)
  elif cl.type == ClassificationType.QUANTITY:
    if detection_utils.has_dual_sv(uttr.detection):
      query_type = QueryType.FILTER_WITH_DUAL_VARS
    else:
      query_type = QueryType.FILTER_WITH_SINGLE_VAR
  else:
    # For any unsupported type, fallback to BASIC
    # TODO: Handle this better.
    query_type = QueryType.BASIC

  if query_type == QueryType.BASIC:
    query_type = _maybe_remap_basic(uttr)

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
  elif prev_type == QueryType.COMPARISON_ACROSS_PLACES:
    if QueryType.CORRELATION_ACROSS_VARS not in query_types:
      next_type = QueryType.CORRELATION_ACROSS_VARS
    else:
      next_type = QueryType.BASIC
  elif prev_type == QueryType.CORRELATION_ACROSS_VARS:
    if QueryType.COMPARISON_ACROSS_PLACES not in query_types:
      next_type = QueryType.COMPARISON_ACROSS_PLACES
    else:
      next_type = QueryType.BASIC

  return next_type


# Route a comparison/correlation classification to a corresponding query_type.
#
def route_comparison_or_correlation(cl_type: ClassificationType,
                                    uttr: Utterance) -> QueryType:
  multi_sv = detection_utils.is_multi_sv(uttr.detection)
  multi_places = len(uttr.places) > 1

  # There are 3 cases here based on current utterance:
  # (1) Single place, not multi-sv
  #     - This is legacy case where we get place/sv from context.
  #     - Interpret COMPARISON as COMPARISON_ACROSS_PLACES
  #       and CORRELATION as CORRELATION_ACROSS_VARS
  # (2) Single place, multi-sv
  #     - Interpret always as CORRELATION_ACROSS_VARS
  #     - If child-type was not specified, we'll use DEFAULT_TYPE.
  # (3) Multiple places (regardless of multi-sv)
  #     - Interpret always as COMPARISON_ACROSS_PLACES
  #     - We'll use the single-SV list
  ctr = ''
  if multi_places:
    ctr = 'multi-place-comparison'
    qt = QueryType.COMPARISON_ACROSS_PLACES
  else:
    if multi_sv:
      ctr = 'multi-sv-correlation'
      qt = QueryType.CORRELATION_ACROSS_VARS
    else:
      if cl_type == ClassificationType.COMPARISON:
        ctr = 'context-place-comparison'
        qt = QueryType.COMPARISON_ACROSS_PLACES
      else:
        ctr = 'context-sv-correlation'
        qt = QueryType.CORRELATION_ACROSS_VARS
  uttr.counters.info('route_comparison_correlation', ctr)
  return qt


# Returns a tuple of QueryType and QueryHandlerConfig
def get_populate_handlers(state: PopulateState):
  handlers = []
  for qt in state.query_types:
    handler = QUERY_HANDLERS.get(qt, None)
    if handler and handler.module:
      handlers.append((qt, handler))
  return handlers
