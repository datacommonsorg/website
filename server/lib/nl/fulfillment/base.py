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

import copy
import time
from typing import List

from server.lib.nl.common import constants
from server.lib.nl.common import utils
from server.lib.nl.common import variable
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import FulfillmentResult
from server.lib.nl.common.utterance import PlaceFallback
from server.lib.nl.common.utterance import QueryType
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import Place
from server.lib.nl.explore import params
from server.lib.nl.fulfillment import simple
from server.lib.nl.fulfillment.existence import chart_vars_fetch
from server.lib.nl.fulfillment.existence import ExtensionExistenceCheckTracker
from server.lib.nl.fulfillment.existence import get_places_to_check
from server.lib.nl.fulfillment.existence import MainExistenceCheckTracker
from server.lib.nl.fulfillment.handlers import get_populate_handlers
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.utils import handle_contained_in_type

# Limit the number of charts.  Each chart may double for per-capita.
# With 3 per row max, allow up to 2 rows, without any per-capita.
_DEFAULT_MAX_NUM_CHARTS = 15
# TODO: This is a temp hack for undata DC.
_EXTREME_MAX_NUM_CHARTS = 200

# Do not do extension API calls for more than these many SVs
_MAX_EXTENSION_SVS = 5

_MAX_RANK = 1000


# Populate chart specs in state.uttr and return True if something was added.
def populate_charts(state: PopulateState) -> bool:
  if not state.uttr.places:
    state.uttr.counters.err('populate_charts_emptyplace', 1)
    state.uttr.place_source = FulfillmentResult.UNRECOGNIZED
    return False

  places = state.uttr.places
  handle_contained_in_type(state, places)

  if not state.chart_vars_map:
    state.uttr.counters.err('num_populate_fallbacks', 1)
    state.uttr.sv_source = FulfillmentResult.UNRECOGNIZED
    return False

  success = _add_charts_with_place_fallback(state, places)

  if not success:
    state.uttr.counters.err('num_populate_fallbacks', 1)
    state.uttr.counters.err('failed_populate_main_svs',
                            list(state.chart_vars_map.keys()))
    if state.chart_vars_map:
      if state.uttr.sv_source == FulfillmentResult.PAST_QUERY:
        # We did not recognize anything in this query, the SV
        # we tried is from the context.
        state.uttr.sv_source = FulfillmentResult.UNRECOGNIZED
      else:
        state.uttr.sv_source = FulfillmentResult.UNFULFILLED
    else:
      state.uttr.sv_source = FulfillmentResult.UNRECOGNIZED
  return success


#
# Populate charts for given places and SVs. If there's a failure, attempt fallback
# to parent places, or parent place-types (for contained-in query-types).
#
# REQUIRES: places and svs are non-empty.
def _add_charts_with_place_fallback(state: PopulateState,
                                    places: List[Place]) -> bool:
  # Add charts for the given places.
  if _add_charts_with_existence_check(state, places):
    return True
  # That failed, we'll attempt fallback.

  # TODO: Support fallback for comparison query-type.
  if state.disable_fallback:
    return False

  if len(places) > 1:
    # This is a worst case sanity check because the only expected caller
    # with num-places > 1 (comparison.py) should disable fallback.
    state.uttr.counters.err('failed_sanitycheck_fallbackwithtoomanyplaces', '')
    return False

  place = places[0]  # Caller populate_charts ensures this exists

  if place.place_type in constants.SUPER_NATIONAL_TYPES:
    # Continent, etc are special in that they have a single parent entity
    # 'Earth' which is of a general type 'Place'. So handle it here
    # (instead of relying on PARENT_PLACE_TYPES).
    earth = Place(
        dcid='Earth',
        name='Earth',
        place_type='Place',
    )
    state.uttr.counters.err('parent_place_fallback', {
        'child': place.dcid,
        'parent': earth.dcid
    })
    return _add_charts_with_existence_check(state, [earth])

  # Get the place-type.  Either of child-place (contained-in query-type),
  # or of the place itself.
  # Use child type only if user had specified the child type.
  has_child_place_type = False
  if state.place_type and not state.had_default_place_type:
    has_child_place_type = True
    pt = state.place_type
  else:
    pt = place.place_type
  if isinstance(pt, str):
    if pt not in set([it.value for it in ContainedInPlaceType]):
      state.uttr.counters.err('failed_unknown_placetype', pt)
      return False
    pt = ContainedInPlaceType(pt)

  # Walk up the parent type hierarchy trying to add charts.
  parent_type = utils.get_parent_place_type(pt, place)
  parent_type = _maybe_switch_parent_type(state, place, parent_type,
                                          has_child_place_type)
  while parent_type:
    if state.place_type:
      if parent_type == place.place_type:
        # This is no longer contained-in, so break
        break
      # Pick next parent type.
      state.uttr.counters.err('parent_place_type_fallback', parent_type)
      state.place_type = parent_type
    else:
      # Pick parent place.
      parents = utils.get_immediate_parent_places(place.dcid, parent_type,
                                                  state.uttr.counters)
      if not parents:
        state.uttr.counters.err('failed_get_parent_places', {
            'dcid': place.dcid,
            'type': parent_type
        })
        return False

      # There's typically a single parent, pick the first.
      state.uttr.counters.err('parent_place_fallback', {
          'child': place.dcid,
          'parent': parents[0].dcid
      })
      place = parents[0]

    if _add_charts_with_existence_check(state, [place]):
      return True
    # Else, try next parent type.
    parent_type = utils.get_parent_place_type(parent_type, place)
    parent_type = _maybe_switch_parent_type(state, place, parent_type,
                                            has_child_place_type)

  return False


def _maybe_switch_parent_type(
    state: PopulateState, place: Place, parent_type: ContainedInPlaceType,
    has_child_place_type: bool) -> ContainedInPlaceType:
  if (has_child_place_type and state.place_type and
      (not parent_type or parent_type.value == place.place_type)):
    # This is the scenario where we have nowhere up to go
    # for child-type hierarchy. Walk up the main-place hierarchy.
    state.place_type = None
    pt = ContainedInPlaceType(place.place_type)
    parent_type = utils.get_parent_place_type(pt, place)
  return parent_type


# Add charts given a place and a list of stat-vars.
def _add_charts_with_existence_check(state: PopulateState,
                                     places: List[Place]) -> bool:
  # This may set state.uttr.place_fallback
  _maybe_set_fallback(state, places)

  # If there is a child place_type, get child place samples for existence check.
  state.places_to_check = get_places_to_check(state, places)

  if not state.places_to_check:
    # Counter updated in get_sample_child_places
    # Always clear fallback when returning False
    clear_fallback(state)
    return False

  # Avoid any mutations in existence tracker.
  chart_vars_map = copy.deepcopy(state.chart_vars_map)
  tracker = MainExistenceCheckTracker(state, state.places_to_check,
                                      chart_vars_map)
  tracker.perform_existence_check()
  state.exist_chart_vars_list = chart_vars_fetch(tracker)

  max_num_charts = _get_max_num_charts(state)

  existing_svs = set()
  found = False
  num_charts = 0

  for (qt, handler) in get_populate_handlers(state):
    state.uttr.counters.info('processed_fulfillment_types',
                             handler.module.__name__.split('.')[-1])
    for idx, exist_cv in enumerate(state.exist_chart_vars_list):
      chart_vars = copy.deepcopy(exist_cv)
      if chart_vars.event:
        if exist_cv.exist_event:
          if handler.module.populate(state, chart_vars, places,
                                     ChartOriginType.PRIMARY_CHART, idx):
            found = True
            num_charts += 1
          else:
            state.uttr.counters.err('failed_populate_callback_primary_event', 1)
      else:
        if chart_vars.svs:
          existing_svs.update(chart_vars.svs)
          if handler.module.populate(state, chart_vars, places,
                                     ChartOriginType.PRIMARY_CHART, idx):
            found = True
            num_charts += 1
          else:
            state.uttr.counters.err('failed_populate_callback_primary', 1)

      # If we have found enough charts, return success
      if num_charts >= max_num_charts:
        break

    # Handle extended/comparable SVs only for simple query since
    # for those we would construct a single bar chart comparing the differe
    # variables.  For other query-types like map/ranking/scatter, we will have
    # individual "related" charts, and those don't look good.
    #
    # TODO: Optimize and enable in Explore mode.
    if (qt == QueryType.BASIC and existing_svs and not state.place_type and
        not state.ranking_types and num_charts < max_num_charts):
      # Note that we want to expand on existing_svs only, and in the
      # order of `svs`
      ordered_existing_svs = [v for v in state.uttr.svs if v in existing_svs]
      found |= _add_charts_for_extended_svs(state=state,
                                            places=places,
                                            svs=ordered_existing_svs,
                                            num_charts=num_charts,
                                            max_num_charts=max_num_charts)

    # For a given handler, if we found any charts at all, we're good.
    if found:
      if (qt == QueryType.BASIC and state.place_type and
          not state.had_default_place_type and
          not state.has_child_type_in_top_basic_charts):
        parent_type = utils.get_parent_place_type(state.place_type, places[0])
        if not parent_type or places[0].place_type == parent_type:
          # This type does not have parent-type, or the parent-type is
          # the main place type.  In this case, ensure we set the fallback
          # message and return success, because we have charts for the main
          # place, after reseting the child-type in state (important for
          # _maybe_set_fallback()).
          state.place_type = None
          state.uttr.counters.info('info_internal_fallback_messaging', 1)
          _maybe_set_fallback(state, places)
        else:
          state.uttr.counters.info('info_internal_placetype_fallback',
                                   state.place_type.value)
          # Important to reset the added charts!
          state.uttr.chartCandidates = []
          found = False
      break

  if not found:
    # Always clear fallback when returning False
    clear_fallback(state)

  return found


def _add_charts_for_extended_svs(state: PopulateState, places: List[Place],
                                 svs: List[str], num_charts: int,
                                 max_num_charts: int) -> bool:
  # Map of main SV -> peer SVs
  # Perform SV extension calls.
  # PERF-TODO: This is expensive! (multiple seconds)
  sv2extensions = {}
  start = time.time()
  svs_for_ext = variable.get_only_svs(svs)[:_MAX_EXTENSION_SVS]
  sv2extensions = variable.extend_svs(svs_for_ext)
  state.uttr.counters.timeit('extend_svs', start)
  state.uttr.counters.info('stat_var_extensions', sv2extensions)

  # Only perform work if we got any extensions.
  has_extensions = False
  for _, ext_svs in sv2extensions.items():
    if len(ext_svs) > 1:
      has_extensions = True
      break
  if not has_extensions:
    return False

  # We extended some SVs, perform existence check.
  # PERF-NOTE: We do two serial existence-checks because the SV extension
  # call is super expensive.
  tracker = ExtensionExistenceCheckTracker(state, state.places_to_check, svs,
                                           sv2extensions)
  tracker.perform_existence_check()

  # A set used to ensure that a set of SVs are constructed into charts
  # only once. For example SV1 and SV2 may both be main SVs, and part of
  # the peer-group.  In that case, the peer-group is processed only once.
  printed_sv_extensions = set()

  found = False
  for exist_state in tracker.exist_sv_states:
    # Infer comparison charts with extended SVs.
    if not exist_state.chart_vars_list:
      continue
    assert len(exist_state.chart_vars_list) == 1, f'{exist_state}'
    chart_vars = tracker.get_chart_vars(exist_state.chart_vars_list[0])
    if len(chart_vars.svs) > 1:
      chart_vars.svs = variable.limit_extended_svs(
          exist_state.sv, set(chart_vars.svs),
          variable.EXTENSION_SV_POST_EXISTENCE_CHECK_LIMIT)
      exist_svs_key = ''.join(sorted(chart_vars.svs))
      if exist_svs_key in printed_sv_extensions:
        continue
      printed_sv_extensions.add(exist_svs_key)

      # Add this as a secondary chart.
      if simple.populate(state, chart_vars, places,
                         ChartOriginType.SECONDARY_CHART, _MAX_RANK):
        found = True
        num_charts += 1
      else:
        state.uttr.counters.err('failed_populate_callback_secondary', 1)

    if num_charts >= max_num_charts:
      return found

  return found


#
# This is a key function that determines if this is a place or place-type
# fallback call, and sets `place_fallback` in Utterance.  The `orig`
# stuff is what user provided and `new` stuff is what we fallback to.
#
# Here are the supported scenarios:
# 1) Fallback from one place-type to another
#    [auto theft in USA counties] => [auto theft in USA states]
# 2) Fallback from one place to another
#    [auto theft in santa clara county] => [auto theft in california]
# 3) Fallback of type and place
#    [auto theft in tracts of santa clara county] => [auto theft in california]
#
def _maybe_set_fallback(state: PopulateState, places: List[Place]):
  # No fallback unless there is exactly one place.
  if len(places) != 1 or len(state.uttr.places) != 1:
    return

  new_place = places[0]
  orig_place = state.uttr.places[0]

  new_type = None
  if state.place_type:
    new_type = state.place_type

  orig_type = None
  pt = utils.get_contained_in_type(state.uttr)
  if pt:
    if pt == ContainedInPlaceType.DEFAULT_TYPE:
      if new_type != None:
        # This is a perfectly legitimate case that happens
        # when promoting SIMPLE to CONTAINED_IN for example.
        # In this case, skip type matching.
        orig_type = new_type
      elif state.had_default_place_type:
        # The user did not request a child-type, so don't
        # report any message.
        orig_type = new_type
      else:
        # We are falling back to parent without a sub-type,
        # so make it clear that we are no longer talking about
        # "places in california" but "california" as a state.
        orig_type = ContainedInPlaceType.PLACE
    elif orig_place.place_type == pt.value:
      # This is the edge case where user has provided a
      # sub-type that matches the main place type,
      # like, [poverty among countries in USA].
      # For this buggy query, we set the new_type to be
      # same as orig_type.
      orig_type = new_type
    else:
      orig_type = pt

  if (utils.is_place_type_match_for_fallback(orig_type, new_type) and
      new_place.dcid == orig_place.dcid):
    return

  if orig_type:
    orig_str = utils.pluralize_place_type(orig_type.value.lower()).lower() \
      + ' in ' + orig_place.name
  else:
    orig_str = orig_place.name

  if new_type:
    new_str = utils.pluralize_place_type(new_type.value.lower()).lower() \
      + ' in ' + new_place.name
  else:
    new_str = new_place.name

  if orig_str == new_str:
    return

  state.uttr.place_fallback = PlaceFallback(origPlace=orig_place,
                                            origType=orig_type,
                                            origStr=orig_str,
                                            newPlace=new_place,
                                            newType=new_type,
                                            newStr=new_str)


def clear_fallback(state: PopulateState):
  state.uttr.place_fallback = None


def _get_max_num_charts(state: PopulateState) -> int:
  # For special DCs use a much higher limit of charts
  # shown. NOTE: This is a hack to allow mix of topics from
  # multiple sources.
  if params.is_special_dc(state.uttr.insight_ctx):
    return _EXTREME_MAX_NUM_CHARTS
  return _DEFAULT_MAX_NUM_CHARTS