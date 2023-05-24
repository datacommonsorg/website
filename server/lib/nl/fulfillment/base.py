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

from dataclasses import dataclass
from dataclasses import field
import logging
import time
from typing import Dict, List

from server.lib.nl import constants
from server.lib.nl import topic
from server.lib.nl import utils
from server.lib.nl import variable
import server.lib.nl.counters as ctr
from server.lib.nl.detection import ContainedInPlaceType
from server.lib.nl.detection import EventType
from server.lib.nl.detection import Place
from server.lib.nl.detection import QuantityClassificationAttributes
from server.lib.nl.detection import RankingType
from server.lib.nl.detection import TimeDeltaType
from server.lib.nl.fulfillment import context
from server.lib.nl.utterance import ChartOriginType
from server.lib.nl.utterance import ChartSpec
from server.lib.nl.utterance import ChartType
from server.lib.nl.utterance import QueryType
from server.lib.nl.utterance import Utterance

_EVENT_PREFIX = 'event/'

# Limit the number of charts.  With 3 per row max, allow up to 5 rows.
_MAX_NUM_CHARTS = 15

# Do do extension API calls for more than these many SVs
_MAX_EXTENSION_SVS = 5


# Data structure to store state for a single "populate" call.
@dataclass
class PopulateState:
  uttr: Utterance
  main_cb: any
  place_type: ContainedInPlaceType = None
  ranking_types: List[RankingType] = field(default_factory=list)
  time_delta_types: List[TimeDeltaType] = field(default_factory=list)
  quantity: QuantityClassificationAttributes = None
  block_id: int = 0


# Data structure for configuring the vars that go into a chart.
@dataclass
class ChartVars:
  # Only one of svs or events is set.
  svs: List[str]
  # Represents a grouping of charts on the resulting display.
  block_id: int
  include_percapita: bool = True
  title: str = ""
  description: str = ""
  title_suffix: str = ""
  # Represents a peer-group of SVs from a Topic.
  is_topic_peer_group: bool = False
  # For response descriptions. Will be inserted into either: "a <str>" or "some <str>s".
  response_type: str = ""
  # If svs came from a topic, the topic dcid.
  source_topic: str = ""
  event: EventType = None
  skip_map_for_ranking: bool = False
  # When `svs` has multiple entries and corresponds to expansion, this represents
  # the original SV.
  orig_sv: str = ""
  # Set for SIMPLE query when all SVs have only one data point.
  has_single_point: bool = False

  # Relevant only when chart_type is RANKED_TIMELINE_COLLECTION
  growth_direction: TimeDeltaType = None
  growth_ranking_type: str = None


#
# Base helper to add a chart spec to an utterance.
# TODO: Deprecate `attrs` by just using ChartVars.  Maybe rename it to ChartAttrs.
#
def add_chart_to_utterance(chart_type: ChartType, state: PopulateState,
                           chart_vars: ChartVars, places: List[Place],
                           primary_vs_secondary: ChartOriginType) -> bool:
  place_type = state.place_type
  if place_type and isinstance(place_type, ContainedInPlaceType):
    # TODO: What's the flow where the instance is string?
    place_type = place_type.value

  attr = {
      "class": primary_vs_secondary,
      "place_type": place_type,
      "ranking_types": state.ranking_types,
      "block_id": chart_vars.block_id,
      "include_percapita": chart_vars.include_percapita,
      "title": chart_vars.title,
      "description": chart_vars.description,
      "chart_type": chart_vars.response_type,
      "source_topic": chart_vars.source_topic
  }
  if chart_vars.skip_map_for_ranking:
    attr['skip_map_for_ranking'] = True
  if chart_vars.growth_direction != None:
    attr['growth_direction'] = chart_vars.growth_direction
  if chart_vars.growth_ranking_type != None:
    attr['growth_ranking_type'] = chart_vars.growth_ranking_type
  if chart_vars.title_suffix:
    attr['title_suffix'] = chart_vars.title_suffix
  if chart_vars.orig_sv:
    attr['orig_sv'] = chart_vars.orig_sv
  ch = ChartSpec(chart_type=chart_type,
                 svs=chart_vars.svs,
                 event=chart_vars.event,
                 places=places,
                 utterance=state.uttr,
                 attr=attr)
  state.uttr.chartCandidates.append(ch)
  state.uttr.counters.info('num_chart_candidates', 1)
  return True


# Generic "populate" processor that process SIMPLE, CONTAINED_IN and RANKING
# chart types and invoke custom callbacks.


# Populate chart specs in state.uttr and return True if something was added.
def populate_charts(state: PopulateState) -> bool:
  if state.uttr.places:
    if (populate_charts_for_places(state, state.uttr.places)):
      return True
    else:
      dcids = [p.dcid for p in state.uttr.places]
      state.uttr.counters.err('failed_populate_main_places', dcids)
  else:
    # If user has not provided a place, seek a place from the context.
    # Otherwise the result seems unexpected to them.
    for pl in context.places_from_context(state.uttr):
      if (populate_charts_for_places(state, [pl])):
        return True
      else:
        state.uttr.counters.err('failed_populate_context_place', pl.dcid)

  # If this query did not have a place, but had a contained-in attribute, we
  # might try specific default places.
  default_place = get_default_contained_in_place(state)
  if default_place:
    return populate_charts_for_places(state, [default_place])

  return False


# Populate charts for given places.
def populate_charts_for_places(state: PopulateState,
                               places: List[Place]) -> bool:
  if not handle_contained_in_type(state, places):
    # Counter updated in handle_contained_in_type()
    return False

  if (len(state.uttr.svs) > 0):
    if _add_charts_with_place_fallback(state, places, state.uttr.svs):
      return True
    else:
      state.uttr.counters.err('failed_populate_main_svs', state.uttr.svs)
  else:
    # If we have not found an SV, only then seek an SV from the context.
    # Otherwise the result seems unexpected to them.
    for svs in context.svs_from_context(state.uttr):
      if _add_charts_with_place_fallback(state, places, svs):
        return True
      else:
        state.uttr.counters.err('failed_populate_context_svs', svs)
  logging.info('Doing fallback for %s - %s',
               ', '.join(_get_place_names(places)), ', '.join(state.uttr.svs))
  state.uttr.counters.err('num_populate_fallbacks', 1)
  return False


#
# Populate charts for given places and SVs. If there's a failure, attempt fallback
# to parent places, or parent place-types (for contained-in query-types).
#
# REQUIRES: places and svs are non-empty.
def _add_charts_with_place_fallback(state: PopulateState, places: List[Place],
                                    svs: List[str]) -> bool:
  # Add charts for the given places.
  if _add_charts(state, places, svs):
    return True
  # That failed, we'll attempt fallback.

  # Only comparison queries have multiple places.
  # TODO: Support fallback for comparison query-type.
  if len(places) > 1:
    return False

  place = places[0]  # Caller populate_charts_for_places ensures this exists

  if place.place_type == 'Continent':
    # Continent is special in that it has a single parent entity
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
    return _add_charts(state, [earth], svs)

  # Get the place-type.  Either of child-place (contained-in query-type),
  # or of the place itself.
  pt = state.place_type if state.place_type else place.place_type
  if isinstance(pt, str):
    pt = ContainedInPlaceType(pt)

  # Walk up the parent type hierarchy trying to add charts.
  parent_type = utils.get_parent_place_type(pt, place)
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

    if _add_charts(state, [place], svs):
      return True
    # Else, try next parent type.
    parent_type = utils.get_parent_place_type(parent_type, place)

  return False


#
# These are data classes to track state needed for batched existence-checks.
#
@dataclass
class ChartVarsExistenceCheckState:
  chart_vars: ChartVars
  # Existing svs from among chart_vars.svs
  # Note that `chart_vars` is not mutated to point to existing SVs.
  exist_svs: List[str]
  # Set only if chart_vars.event is true, to indicate event existence.
  exist_event: bool = False


@dataclass
class SVExistenceCheckState:
  sv: str
  chart_vars_list: List[ChartVarsExistenceCheckState]
  # ChartVars for extended SVs.
  extended_vars: ChartVarsExistenceCheckState


#
# This class helps batch existence checks.
#
class ExistenceCheckStateTracker:

  # NOTE: If sv2extensions is set, then this is for extensions only.
  def __init__(self, state: PopulateState, places: List[str], svs: List[str],
               sv2extensions: Dict):
    self.state = state
    self.places = places
    self.all_svs = set()
    self.exist_sv_states: List[SVExistenceCheckState] = []
    # Map of existing SVs with key as SV DCID and value as
    # whether the SV has single-data point.
    self.existing_svs = {}

    # Loop over all SVs, and construct existence check state.
    for rank, sv in enumerate(svs):
      exist_state = SVExistenceCheckState(sv=sv,
                                          chart_vars_list=[],
                                          extended_vars=None)

      if not sv2extensions:
        chart_vars_list = _build_chart_vars(state, sv, rank)
        for chart_vars in chart_vars_list:
          exist_cv = ChartVarsExistenceCheckState(chart_vars=chart_vars,
                                                  exist_svs=[])
          if chart_vars.event:
            exist_cv.exist_event = utils.event_existence_for_place(
                places[0], chart_vars.event, self.state.uttr.counters)
            if not exist_cv.exist_event:
              state.uttr.counters.err(
                  'failed_event_existence_check', {
                      'places': places[:constants.DBG_LIST_LIMIT],
                      'event': chart_vars.event
                  })
          else:
            if all(v in self.all_svs for v in chart_vars.svs):
              # Avoid adding SVs that have already been added before.
              continue
          self.all_svs.update(chart_vars.svs)
          exist_state.chart_vars_list.append(exist_cv)
      else:
        # Infer comparison charts with extended SVs.
        extended_svs = sv2extensions.get(sv, [])
        if extended_svs and not all(v in self.all_svs for v in extended_svs):
          state.block_id += 1
          exist_state.extended_vars = ChartVarsExistenceCheckState(
              chart_vars=ChartVars(svs=extended_svs,
                                   block_id=state.block_id,
                                   orig_sv=sv),
              exist_svs=[])
          self.all_svs.update(extended_svs)

      # If we have the main chart-vars or extended-svs, add.
      if exist_state.chart_vars_list or exist_state.extended_vars:
        self.exist_sv_states.append(exist_state)

  def perform_existence_check(self):
    # Perform batch existence check.
    if self.state.uttr.query_type == QueryType.SIMPLE:
      self.existing_svs = utils.sv_existence_for_places_check_single_point(
          self.places, list(self.all_svs), self.state.uttr.counters)
    else:
      tmp_svs = utils.sv_existence_for_places(self.places, list(self.all_svs),
                                              self.state.uttr.counters)
      self.existing_svs = {v: False for v in tmp_svs}

    if self.existing_svs:
      logging.info('Existence check succeeded for %s - %s',
                   ', '.join(self.places), ', '.join(self.existing_svs.keys()))
    else:
      logging.info('Existence check failed for %s - %s', ', '.join(self.places),
                   ', '.join(self.all_svs))
      self.state.uttr.counters.err(
          'failed_existence_check', {
              'places': self.places[:constants.DBG_LIST_LIMIT],
              'type': self.state.place_type,
              'svs': list(self.all_svs)[:constants.DBG_LIST_LIMIT],
          })
      return

    # Set "exist_svs" and "extended_exist_svs" in the same order it was originally found.
    for es in self.exist_sv_states:

      for ecv in es.chart_vars_list:
        if ecv.chart_vars.event:
          continue
        for sv in ecv.chart_vars.svs:
          if sv in self.existing_svs:
            ecv.exist_svs.append(sv)
        if len(ecv.exist_svs) < len(ecv.chart_vars.svs):
          self.state.uttr.counters.err(
              'failed_partial_existence_check', {
                  'places':
                      self.places,
                  'type':
                      self.state.place_type,
                  'svs':
                      list(
                          set(ecv.chart_vars.svs) -
                          set(self.existing_svs.keys()))
                      [:constants.DBG_LIST_LIMIT],
              })

      if not es.extended_vars:
        continue

      for esv in es.extended_vars.chart_vars.svs:
        if esv in self.existing_svs:
          es.extended_vars.exist_svs.append(esv)

      if len(es.extended_vars.exist_svs) < len(es.extended_vars.chart_vars.svs):
        self.state.uttr.counters.err(
            'failed_existence_check_extended_svs', {
                'places':
                    self.places[:constants.DBG_LIST_LIMIT],
                'type':
                    self.state.place_type,
                'svs':
                    list(
                        set(es.extended_vars.chart_vars.svs) -
                        set(es.extended_vars.exist_svs))
                    [:constants.DBG_LIST_LIMIT]
            })
        logging.info('Existence check failed for %s - %s',
                     ', '.join(self.places),
                     ', '.join(es.extended_vars.chart_vars.svs))

  # Get chart-vars for addition to charts
  def get_chart_vars(self,
                     cv_existence: ChartVarsExistenceCheckState) -> ChartVars:
    cv = cv_existence.chart_vars
    # Set existing SVs.
    cv.svs = cv_existence.exist_svs
    # Set `has_single_point` if all SVs in the ChartVars have a single-data point.
    # Do so only for SIMPLE charts.
    if self.state.uttr.query_type == QueryType.SIMPLE:
      cv.has_single_point = all(self.existing_svs.get(v, False) for v in cv.svs)
    return cv


# Add charts given a place and a list of stat-vars.
def _add_charts(state: PopulateState, places: List[Place],
                svs: List[str]) -> bool:
  logging.info("Add chart %s %s" % (', '.join(_get_place_names(places)), svs))

  # If there is a child place_type, get child place samples for existence check.
  places_to_check = _get_place_dcids(places)
  if state.place_type:
    # REQUIRES: len(places) == 1
    places_to_check = utils.get_sample_child_places(places[0].dcid,
                                                    state.place_type.value,
                                                    state.uttr.counters)
  if not places_to_check:
    # Counter updated in get_sample_child_places
    return False

  tracker = ExistenceCheckStateTracker(state, places_to_check, svs, {})
  tracker.perform_existence_check()

  found = False
  num_charts = 0
  for exist_state in tracker.exist_sv_states:

    # Infer charts for the main SV/Topic.
    for exist_cv in exist_state.chart_vars_list:
      chart_vars = tracker.get_chart_vars(exist_cv)
      # Now that we've found existing vars, call the per-chart-type callback.
      if chart_vars.event:
        if exist_cv.exist_event:
          if state.main_cb(state, chart_vars, places,
                           ChartOriginType.PRIMARY_CHART):
            found = True
            num_charts += 1
          else:
            state.uttr.counters.err('failed_populate_callback_primary_event', 1)
      else:
        if chart_vars.svs:
          if state.main_cb(state, chart_vars, places,
                           ChartOriginType.PRIMARY_CHART):
            found = True
            num_charts += 1
          else:
            state.uttr.counters.err('failed_populate_callback_primary', 1)

      # If we have found enough charts, return success
      if num_charts >= _MAX_NUM_CHARTS:
        return True

  # Handle extended/comparable SVs only for simple query since
  # for those we would construct a single bar chart comparing the differe
  # variables.  For other query-types like map/ranking/scatter, we will have
  # individual "related" charts, and those don't look good.
  if (state.uttr.query_type == QueryType.SIMPLE and
      _add_charts_for_extended_svs(
          state=state, places=places, places_to_check=places_to_check,
          svs=svs)):
    found = True

  return found


def _add_charts_for_extended_svs(state: PopulateState, places: List[Place],
                                 places_to_check: List[str],
                                 svs: List[str]) -> bool:

  # Map of main SV -> peer SVs
  # Perform SV extension calls.
  # PERF-TODO: This is expensive! (multiple seconds)
  sv2extensions = {}
  start = time.time()
  svs_for_ext = utils.get_only_svs(svs)[:_MAX_EXTENSION_SVS]
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
  tracker = ExistenceCheckStateTracker(state, places_to_check, svs,
                                       sv2extensions)
  tracker.perform_existence_check()

  # A set used to ensure that a set of SVs are constructed into charts
  # only once. For example SV1 and SV2 may both be main SVs, and part of
  # the peer-group.  In that case, the peer-group is processed only once.
  printed_sv_extensions = set()

  found = False
  for exist_state in tracker.exist_sv_states:
    # Infer comparison charts with extended SVs.
    if not exist_state.extended_vars:
      continue
    chart_vars = tracker.get_chart_vars(exist_state.extended_vars)
    if len(chart_vars.svs) > 1:
      exist_svs_key = ''.join(sorted(chart_vars.svs))
      if exist_svs_key in printed_sv_extensions:
        continue
      printed_sv_extensions.add(exist_svs_key)

      # Add this as a secondary chart.
      if state.main_cb(state, chart_vars, places,
                       ChartOriginType.SECONDARY_CHART):
        found = True
      else:
        state.uttr.counters.err('failed_populate_callback_secondary', 1)

  return found


def _get_place_dcids(places: List[Place]) -> List[str]:
  dcids = []
  for p in places:
    dcids.append(p.dcid)
  return dcids


def _get_place_names(places: List[Place]) -> List[str]:
  names = []
  for p in places:
    names.append(p.name)
  return names


#
# Returns a list of ChartVars, where each ChartVars may be a single SV or
# group of SVs.
#
def _build_chart_vars(state: PopulateState, sv: str,
                      rank: int) -> List[ChartVars]:
  if utils.is_sv(sv):
    state.block_id += 1
    return [ChartVars(svs=[sv], block_id=state.block_id)]
  if utils.is_topic(sv):
    start = time.time()
    topic_vars = topic.get_topic_vars(sv, rank)
    peer_groups = topic.get_topic_peers(topic_vars)

    # Classify into two lists.
    just_svs = []
    svpgs = []
    for v in topic_vars:
      if v in peer_groups and peer_groups[v]:
        title = topic.svpg_name(v)
        description = topic.svpg_description(v)
        svpgs.append((title, description, peer_groups[v]))
      else:
        just_svs.append(v)
    state.uttr.counters.timeit('topic_calls', start)

    # Group into blocks carefully:

    # 1. Make a block for all SVs in just_svs
    state.block_id += 1
    charts = []
    for v in just_svs:
      # Skip PC for this case (per prior implementation)
      svs = []
      event = None
      if v.startswith(_EVENT_PREFIX):
        config_key = v[len(_EVENT_PREFIX):]
        etype = constants.EVENT_CONFIG_KEY_TO_EVENT_TYPE.get(config_key, None)
        if not etype:
          continue
        event = etype
      else:
        svs = [v]
      charts.append(
          ChartVars(svs=svs,
                    event=event,
                    block_id=state.block_id,
                    include_percapita=False,
                    source_topic=sv))

    # 2. Make a block for every peer-group in svpgs
    for (title, description, svs) in svpgs:
      state.block_id += 1
      charts.append(
          ChartVars(svs=svs,
                    block_id=state.block_id,
                    include_percapita=False,
                    title=title,
                    description=description,
                    is_topic_peer_group=True,
                    source_topic=sv))

    state.uttr.counters.info('topics_processed',
                             {sv: {
                                 'svs': just_svs,
                                 'peer_groups': svpgs,
                             }})
    return charts

  return []


# Takes a list of ordered vars which may contain SV and topic,
# opens up "highly ranked" topics into SVs and returns it
# ordered.
def open_top_topics_ordered(svs: List[str],
                            counters: ctr.Counters) -> List[str]:
  opened_svs = []
  sv_set = set()
  start = time.time()
  for rank, var in enumerate(svs):
    for sv in _open_topic_in_var(var, rank, counters):
      if sv not in sv_set:
        opened_svs.append(sv)
        sv_set.add(sv)
  counters.timeit('open_top_topics_ordered', start)
  return opened_svs


def _open_topic_in_var(sv: str, rank: int, counters: ctr.Counters) -> List[str]:
  if utils.is_sv(sv):
    return [sv]
  if utils.is_topic(sv):
    topic_vars = topic.get_topic_vars(sv, rank)
    peer_groups = topic.get_topic_peers(topic_vars)

    # Classify into two lists.
    just_svs = []
    svpgs = []
    for v in topic_vars:
      if v in peer_groups and peer_groups[v]:
        title = topic.svpg_name(v)
        svpgs.append((title, peer_groups[v]))
      else:
        just_svs.append(v)

    svs = just_svs
    for (title, svpg) in svpgs:
      svs.extend(svpg)

    counters.info('topics_processed',
                  {sv: {
                      'svs': just_svs,
                      'peer_groups': svpgs,
                  }})

    return svs

  return []


def handle_contained_in_type(state: PopulateState, places: List[Place]):
  if (state.place_type == ContainedInPlaceType.DEFAULT_TYPE and
      len(places) == 1):
    state.place_type = utils.get_default_child_place_type(places[0])
    state.uttr.counters.info('contained_in_across_fallback',
                             state.place_type.value)
    return True

  if state.place_type and places:
    ptype = state.place_type
    state.place_type = utils.admin_area_equiv_for_place(ptype, places[0])
    if ptype != state.place_type:
      state.uttr.counters.info('contained_in_admin_area_equivalent',
                               (ptype, state.place_type))

    if places[0].place_type == state.place_type.value:
      state.uttr.counters.err('contained_in_sameplacetype',
                              state.place_type.value)
      return False

  return True


def get_default_contained_in_place(state: PopulateState) -> Place:
  if state.uttr.places:
    return None
  if not state.place_type:
    # For a non-contained-in-place query, default to USA.
    return constants.USA
  ptype = state.place_type
  if isinstance(ptype, str):
    ptype = ContainedInPlaceType(ptype)
  return constants.DEFAULT_PARENT_PLACES.get(ptype, None)
