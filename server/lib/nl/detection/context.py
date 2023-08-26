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

#
# This merges an utterance with its prior state to produce a unified
# single utterance.  It also produces an Explore args dict.
#

from typing import List

from server.lib.explore.params import Params
from server.lib.nl.common import constants
from server.lib.nl.common import serialize
import server.lib.nl.common.topic as topic
import server.lib.nl.common.utils as utils
import server.lib.nl.common.utterance as nl_uttr
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import ContainedInClassificationAttributes
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import Place
import server.lib.nl.detection.utils as dutils
from server.lib.nl.fulfillment.handlers import route_comparison_or_correlation
from server.lib.nl.fulfillment.utils import get_default_contained_in_place
import server.lib.nl.fulfillment.utils as futils

_MAX_RETURNED_VARS = 20


#
# Given an utterance, this looks up past utterance and updates the merged
# context in both the utterance inline and in `insight_ctx`.
#
# TODO: Handle OVERVIEW query (for Explore)
def merge_with_context(uttr: nl_uttr.Utterance, is_sdg: bool = False):
  data_dict = {}

  # 1. Route comparison vs. correlation query.
  query_type = None
  cl_type = _get_comparison_or_correlation(uttr)
  if cl_type != None:
    query_type = route_comparison_or_correlation(cl_type, uttr)

  # 2. Get place-type.
  # TODO: Confirm type for ranking
  place_type = utils.get_contained_in_type(uttr)

  if not place_type and not uttr.svs and not uttr.places:
    # Evertyhing is empty, don't look into context.
    uttr.insight_ctx = {}
    return

  # TODO: Clean up place_type setting.
  if not place_type and query_type == nl_uttr.QueryType.CORRELATION_ACROSS_VARS:
    # We look up into context
    if not place_type and uttr.prev_utterance:
      place_type = utils.get_contained_in_type(uttr.prev_utterance)
      if place_type:
        uttr.classifications.append(
            NLClassifier(type=ClassificationType.CONTAINED_IN,
                         attributes=ContainedInClassificationAttributes(
                             contained_in_place_type=place_type)))
    # If its still empty, set default.
    if not place_type:
      uttr.classifications.append(
          NLClassifier(
              type=ClassificationType.CONTAINED_IN,
              attributes=ContainedInClassificationAttributes(
                  contained_in_place_type=ContainedInPlaceType.DEFAULT_TYPE)))
  if not place_type and utils.get_quantity(uttr):
    # When there is quantity, we add place_type
    uttr.classifications.append(
        NLClassifier(
            type=ClassificationType.CONTAINED_IN,
            attributes=ContainedInClassificationAttributes(
                contained_in_place_type=ContainedInPlaceType.DEFAULT_TYPE)))
  if place_type:
    if place_type == ContainedInPlaceType.SCHOOL:
      # HACK: Promote school to public school since we don't have data
      # for just School.
      place_type = ContainedInPlaceType.PUBLIC_SCHOOL
      for c in uttr.classifications:
        if (c.type == ClassificationType.CONTAINED_IN and
            isinstance(c.attributes, ContainedInClassificationAttributes) and
            c.attributes.contained_in_place_type
            == ContainedInPlaceType.SCHOOL):
          c.attributes.contained_in_place_type = ContainedInPlaceType.PUBLIC_SCHOOL

  # 4. Detect places (and comparison type) leveraging context.
  places, cmp_places = _detect_places(
      uttr, place_type,
      query_type == nl_uttr.QueryType.COMPARISON_ACROSS_PLACES)

  # 5. Detect SVs leveraging context.
  main_vars, cmp_vars = _detect_vars(
      uttr, query_type == nl_uttr.QueryType.CORRELATION_ACROSS_VARS)

  # 6. Populate the returned dict
  data_dict.update({
      Params.ENTITIES.value:
          places,
      Params.VARS.value:
          main_vars[:_MAX_RETURNED_VARS],
      Params.SESSION_ID.value:
          uttr.session_id,
      Params.CMP_ENTITIES.value:
          cmp_places,
      Params.CMP_VARS.value:
          cmp_vars[:_MAX_RETURNED_VARS],
      Params.CHILD_TYPE.value:
          '' if not place_type else place_type.value,
      Params.CLASSIFICATIONS.value:
          serialize.classification_to_dict(uttr.classifications),
  })

  # 7. Set the detected params in uttr ctx and clear past contexts.
  uttr.insight_ctx = data_dict


def _detect_vars(uttr: nl_uttr.Utterance, is_cmp: bool) -> List[str]:
  svs = []
  cmp_svs = []
  if is_cmp:
    # Comparison
    if dutils.is_multi_sv(uttr.detection):
      # This comes from multi-var detection which would have deduped.
      # Already multi-sv, nothing to do in `uttr`
      svs, cmp_svs = _get_multi_sv_pair(uttr)
      uttr.sv_source = nl_uttr.FulfillmentResult.CURRENT_QUERY
    else:
      if uttr.svs and uttr.prev_utterance and uttr.prev_utterance.svs:
        # Set `multi-sv`
        svs = uttr.svs
        cmp_svs = uttr.prev_utterance.svs
        # Set a very basic score. Since this is only used by correlation
        # which will do so regardless of the score.
        uttr.multi_svs = dutils.get_multi_sv(svs, cmp_svs, 0.51)
        # Important to set in detection since `correlation.py` refers to that.
        uttr.detection.svs_detected.multi_sv = uttr.multi_svs
        uttr.sv_source = nl_uttr.FulfillmentResult.PARTIAL_PAST_QUERY
  else:
    # No comparison.
    if uttr.svs:
      svs = uttr.svs
      uttr.sv_source = nl_uttr.FulfillmentResult.CURRENT_QUERY
    else:
      # Try to get svs from context.
      if uttr.prev_utterance and uttr.prev_utterance.svs:
        svs = uttr.prev_utterance.svs
        uttr.svs = svs
        uttr.counters.info('insight_var_ctx', svs)
        uttr.sv_source = nl_uttr.FulfillmentResult.PAST_QUERY

  return svs, cmp_svs


def _get_comparison_or_correlation(
    uttr: nl_uttr.Utterance) -> ClassificationType:
  # Mimic NL behavior when there are multiple places.
  if len(uttr.places) > 1:
    return ClassificationType.COMPARISON
  for cl in uttr.classifications:
    if cl.type in [
        ClassificationType.COMPARISON, ClassificationType.CORRELATION
    ]:
      return cl.type
  return None


def _get_multi_sv_pair(uttr: nl_uttr.Utterance) -> List[str]:
  parts = dutils.get_multi_sv_pair(uttr.detection)
  if not parts or len(parts) != 2:
    return []
  return parts[0].svs, parts[1].svs


def _detect_places(uttr: nl_uttr.Utterance, child_type: ContainedInPlaceType,
                   is_cmp: bool) -> List[str]:
  places = []
  cmp_places = []
  #
  # Note on Answer Places handling: we should process it after adding the
  # places in current query, and *before* processing places in context.
  # That way, before consuming the context place we would use any answer places.
  #
  if is_cmp:
    if len(uttr.places) > 1:
      # Completely in this query.
      places = [uttr.places[0].dcid]
      cmp_places = [p.dcid for p in uttr.places[1:]]
      uttr.place_source = nl_uttr.FulfillmentResult.CURRENT_QUERY

      if _handle_answer_places(uttr, child_type, places, cmp_places):
        return places, cmp_places
    elif len(uttr.places) == 1:
      # Partially in this query, lookup context.
      places = [uttr.places[0].dcid]
      places_to_compare = []
      if uttr.prev_utterance and uttr.prev_utterance.places:
        places_to_compare = uttr.prev_utterance.places
      cmp_places = [p.dcid for p in places_to_compare]
      uttr.places.extend(places_to_compare)
      uttr.counters.info('insight_cmp_partial_place_ctx', cmp_places)
      uttr.place_source = nl_uttr.FulfillmentResult.PARTIAL_PAST_QUERY

      if _handle_answer_places(uttr, child_type, places, cmp_places):
        return places, cmp_places
    else:
      # There are NO places, so if there are answer places, bail.
      if _handle_answer_places(uttr, child_type, places, cmp_places):
        return places, cmp_places

      # Completely in context.
      ctx_places = []
      if uttr.prev_utterance and uttr.prev_utterance.places:
        uttr.places = uttr.prev_utterance.places
        ctx_places = [p.dcid for p in uttr.places]
      if len(ctx_places) > 1:
        places = ctx_places[:1]
        cmp_places = ctx_places[1:]
      else:
        places = ctx_places
      uttr.place_source = nl_uttr.FulfillmentResult.PAST_QUERY
      uttr.counters.info('insight_cmp_place_ctx', places)
  else:
    # Not comparison.
    if uttr.places:
      places = [p.dcid for p in uttr.places]
      uttr.place_source = nl_uttr.FulfillmentResult.CURRENT_QUERY

      if _handle_answer_places(uttr, child_type, places, cmp_places):
        return places, cmp_places
    else:
      # There are NO places, so if there are answer places, bail.
      if _handle_answer_places(uttr, child_type, places, cmp_places):
        return places, cmp_places

      # Match NL behavior in `populate_charts()` by not using context
      # when the place-type is country.
      if child_type == ContainedInPlaceType.COUNTRY:
        places = [constants.EARTH_DCID]
        uttr.places = [constants.EARTH]
        uttr.counters.info('insight_place_earth', places)
        uttr.place_source = nl_uttr.FulfillmentResult.DEFAULT
        uttr.past_source_context = constants.EARTH.name
      else:
        # Find place from context.
        if uttr.prev_utterance and uttr.prev_utterance.places:
          # Only pick the main place from the context since this
          # is NOT a comparison query.
          uttr.places = uttr.prev_utterance.places
          places = [uttr.places[0].dcid]
          if len(uttr.places) > 1:
            cmp_places = [p.dcid for p in uttr.places[1:]]
          uttr.counters.info('insight_place_ctx', places)
          uttr.place_source = nl_uttr.FulfillmentResult.PAST_QUERY
          uttr.past_source_context = uttr.places[0].name

  # Match NL behavior: if there was a child type and no context place,
  # use a default place.
  if not places and child_type:
    default_place = get_default_contained_in_place(places, child_type)
    if default_place:
      uttr.places = [default_place]
      places = [default_place.dcid]
      uttr.place_source = nl_uttr.FulfillmentResult.DEFAULT
      uttr.past_source_context = default_place.name

  if not places:
    uttr.places = [constants.USA]
    places = [constants.USA.dcid]
    uttr.place_source = nl_uttr.FulfillmentResult.DEFAULT
    uttr.past_source_context = constants.USA.name

  return places, cmp_places


def _handle_answer_places(uttr: nl_uttr.Utterance,
                          child_type: ContainedInPlaceType, places: List[str],
                          cmp_places: List[str]) -> bool:
  if not futils.classifications_of_type(
      uttr.classifications, ClassificationType.ANSWER_PLACES_REFERENCE):
    return False
  if not uttr.prev_utterance or not uttr.prev_utterance.answerPlaces:
    return False
  if not child_type:
    return False

  ans_places = uttr.prev_utterance.answerPlaces
  if uttr.places:
    _append(ans_places, cmp_places)
  elif len(ans_places) > 1:
    _append(ans_places[:1], places)
    _append(ans_places[1:], cmp_places)
  else:
    _append(ans_places, places)
  uttr.places.extend(ans_places)
  uttr.place_source = nl_uttr.FulfillmentResult.PAST_ANSWER
  uttr.past_source_context = "Query Results"

  uttr.counters.info('include_answer_places', [p.dcid for p in ans_places])
  return True


# Adds src to dst without dups.
def _append(src: List[Place], dst: List[str]):
  for p in src:
    if p.dcid not in dst:
      dst.append(p.dcid)
