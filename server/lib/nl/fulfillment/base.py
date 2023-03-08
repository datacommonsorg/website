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
from typing import Dict, List

from server.lib.nl import constants
from server.lib.nl import topic
from server.lib.nl import utils
from server.lib.nl import variable
from server.lib.nl.detection import ContainedInPlaceType
from server.lib.nl.detection import EventType
from server.lib.nl.detection import Place
from server.lib.nl.detection import RankingType
from server.lib.nl.detection import TimeDeltaType
from server.lib.nl.fulfillment import context
from server.lib.nl.utterance import ChartOriginType
from server.lib.nl.utterance import ChartSpec
from server.lib.nl.utterance import ChartType
from server.lib.nl.utterance import QueryType
from server.lib.nl.utterance import Utterance

# TODO: Factor classification processing functions into a common place.

_EVENT_PREFIX = 'event/'


# Data structure to store state for a single "populate" call.
@dataclass
class PopulateState:
  uttr: Utterance
  main_cb: any
  place_type: ContainedInPlaceType = None
  ranking_types: List[RankingType] = field(default_factory=list)
  time_delta_types: List[TimeDeltaType] = field(default_factory=list)
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
  # Represents a peer-group of SVs from a Topic.
  is_topic_peer_group: bool = False
  # For response descriptions. Will be inserted into either: "a <str>" or "some <str>s".
  response_type: str = ""
  # If svs came from a topic, the topic dcid.
  source_topic: str = ""
  event: EventType = None
  skip_map_for_ranking: bool = False

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
  ch = ChartSpec(chart_type=chart_type,
                 svs=chart_vars.svs,
                 event=chart_vars.event,
                 places=places,
                 utterance=state.uttr,
                 attr=attr)
  state.uttr.chartCandidates.append(ch)
  utils.update_counter(state.uttr.counters, 'num_chart_candidates', 1)
  return True


# Generic "populate" processor that process SIMPLE, CONTAINED_IN and RANKING
# chart types and invoke custom callbacks.


# Populate chart specs in state.uttr and return True if something was added.
def populate_charts(state: PopulateState) -> bool:
  if state.uttr.places:
    if (populate_charts_for_places(state, state.uttr.places)):
      return True
    else:
      utils.update_counter(state.uttr.counters, 'failed_populate_main_places',
                           state.uttr.places)
  else:
    # If user has not provided a place, seek a place from the context.
    # Otherwise the result seems unexpected to them.
    for pl in context.places_from_context(state.uttr):
      if (populate_charts_for_places(state, [pl])):
        return True
      else:
        utils.update_counter(state.uttr.counters,
                             'failed_populate_context_place', pl.dcid)

  # If this query did not have a place, but had a contained-in attribute, we
  # might try specific default places.
  default_place = get_default_contained_in_place(state)
  if default_place:
    return populate_charts_for_places(state, [default_place])

  return False


# Populate charts for given places.
def populate_charts_for_places(state: PopulateState,
                               places: List[Place]) -> bool:
  handle_contained_in_across(state, places)

  if (len(state.uttr.svs) > 0):
    if _add_charts_with_place_fallback(state, places, state.uttr.svs):
      return True
    else:
      utils.update_counter(state.uttr.counters, 'failed_populate_main_svs',
                           state.uttr.svs)
  else:
    # If we have not found an SV, only then seek an SV from the context.
    # Otherwise the result seems unexpected to them.
    for svs in context.svs_from_context(state.uttr):
      if _add_charts_with_place_fallback(state, places, svs):
        return True
      else:
        utils.update_counter(state.uttr.counters, 'failed_populate_context_svs',
                             svs)
  logging.info('Doing fallback for %s - %s',
               ', '.join(_get_place_names(places)), ', '.join(state.uttr.svs))
  utils.update_counter(state.uttr.counters, 'num_populate_fallbacks', 1)
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

  # Get the place-type.  Either of child-place (contained-in query-type),
  # or of the place itself.
  pt = state.place_type if state.place_type else places[0].place_type
  if isinstance(pt, str):
    pt = ContainedInPlaceType(pt)

  place = places[0]  # Caller populate_charts_for_places ensures this exists

  # Walk up the parent type hierarchy trying to add charts.
  parent_type = constants.PARENT_PLACE_TYPES.get(pt, None)
  while parent_type:
    if state.place_type:
      # Pick next parent type.
      utils.update_counter(state.uttr.counters, 'parent_place_type_fallback',
                           parent_type)
      state.place_type = parent_type
    else:
      # Pick parent place.
      parents = utils.get_immediate_parent_places(place.dcid, parent_type)
      if not parents:
        utils.update_counter(state.uttr.counters, 'failed_get_parent_places', {
            'dcid': place.dcid,
            'type': parent_type
        })
        return False

      # There's typically a single parent, pick the first.
      utils.update_counter(state.uttr.counters, 'parent_place_fallback', {
          'child': place.dcid,
          'parent': parents[0].dcid
      })
      place = parents[0]

    if _add_charts(state, [place], svs):
      return True
    # Else, try next parent type.
    parent_type = constants.PARENT_PLACE_TYPES.get(parent_type, None)

  return False


#
# These are data classes to track state needed for batched existence-checks.
#
@dataclass
class ChartVarsExistenceCheckState:
  chart_vars: ChartVars
  # Existing svs from among chart_vars.svs
  exist_svs: List[str]
  # Set only if chart_vars.event is set
  exist_event: bool = False


@dataclass
class SVExistenceCheckState:
  sv: str
  chart_vars_list: List[ChartVarsExistenceCheckState]

  extended_svs: List[str]
  # Existence check result for extended SVs.
  extended_exist_svs: List[str]


#
# This class helps batch existence checks.
#
class ExistenceCheckStateTracker:

  def __init__(self, state: PopulateState, places: List[str], svs: List[str],
               sv2extensions: Dict):
    self.state = state
    self.places = places
    self.all_svs = set()
    self.exist_sv_states: List[SVExistenceCheckState] = []

    # Loop over all SVs, and construct existence check state.
    for rank, sv in enumerate(svs):
      exist_state = SVExistenceCheckState(sv=sv,
                                          chart_vars_list=[],
                                          extended_svs=[],
                                          extended_exist_svs=[])

      chart_vars_list = _build_chart_vars(state, sv, rank)
      for chart_vars in chart_vars_list:
        exist_cv = ChartVarsExistenceCheckState(chart_vars=chart_vars,
                                                exist_svs=[])
        if chart_vars.event:
          exist_cv.exist_event = utils.event_existence_for_place(
              places[0].dcid, chart_vars.event)
          if not exist_cv.exist_event:
            utils.update_counter(state.uttr.counters,
                                 'failed_event_existence_check', {
                                     'places': places,
                                     'event': chart_vars.event
                                 })
        else:
          self.all_svs.update(chart_vars.svs)
        exist_state.chart_vars_list.append(exist_cv)

      # Infer comparison charts with extended SVs.
      extended_svs = sv2extensions.get(sv, [])
      if extended_svs:
        exist_state.extended_svs = extended_svs
        self.all_svs.update(extended_svs)

      self.exist_sv_states.append(exist_state)

  def perform_existence_check(self):
    # Perform batch existence check.
    exist_svs = utils.sv_existence_for_places(self.places, list(self.all_svs))
    exist_svs = set(exist_svs)
    if exist_svs:
      logging.info('Existence check succeeded for %s - %s',
                   ', '.join(self.places), ', '.join(exist_svs))
    else:
      logging.info('Existence check failed for %s - %s', ', '.join(self.places),
                   ', '.join(self.all_svs))
      utils.update_counter(self.state.uttr.counters, 'failed_existence_check', {
          'places': self.places,
          'svs': list(self.all_svs),
      })
      return

    # Set "exist_svs" and "extended_exist_svs" in the same order it was originally found.
    for es in self.exist_sv_states:

      for ecv in es.chart_vars_list:
        for sv in ecv.chart_vars.svs:
          if sv in exist_svs:
            ecv.exist_svs.append(sv)
        if len(ecv.exist_svs) < len(ecv.chart_vars.svs):
          utils.update_counter(
              self.state.uttr.counters, 'failed_partial_existence_check', {
                  'places': self.places,
                  'svs': list(set(ecv.chart_vars.svs) - set(exist_svs)),
              })

      for esv in es.extended_svs:
        if esv in exist_svs:
          es.extended_exist_svs.append(esv)

      if len(es.extended_exist_svs) < len(es.extended_svs):
        utils.update_counter(
            self.state.uttr.counters, 'failed_existence_check_extended_svs', {
                'places': self.places,
                'svs': list(set(es.extended_svs) - set(es.extended_exist_svs))
            })
        logging.info('Existence check failed for %s - %s',
                     ', '.join(self.places), ', '.join(es.extended_svs))


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

  # Handle extended/comparable SVs only for simple query since
  # for those we would construct a single bar chart comparing the differe
  # variables.  For other query-types like map/ranking/scatter, we will have
  # indidividual "related" charts, and those don't look good.
  #
  # Map of main SV -> peer SVs
  sv2extensions = {}
  if state.uttr.query_type == QueryType.SIMPLE:
    sv2extensions = variable.extend_svs(utils.get_only_svs(svs))
    utils.update_counter(state.uttr.counters, 'stat_var_extensions',
                         sv2extensions)

  tracker = ExistenceCheckStateTracker(state, places_to_check, svs,
                                       sv2extensions)
  tracker.perform_existence_check()

  # A set used to ensure that a set of SVs are constructed into charts
  # only once. For example SV1 and SV2 may both be main SVs, and part of
  # the peer-group.  In that case, the peer-group is processed only once.
  printed_sv_extensions = set()

  found = False
  for exist_state in tracker.exist_sv_states:

    # Infer charts for the main SV/Topic.
    for exist_cv in exist_state.chart_vars_list:
      chart_vars = exist_cv.chart_vars
      if chart_vars.event:
        # For this check the parent place.
        if exist_cv.exist_event:
          if state.main_cb(state, chart_vars, places,
                           ChartOriginType.PRIMARY_CHART):
            found = True
          else:
            utils.update_counter(state.uttr.counters,
                                 'failed_populate_callback_primary_event', 1)
      else:
        exist_svs = exist_cv.exist_svs
        if exist_svs:
          chart_vars.svs = exist_svs
          # Now that we've found existing vars, call the per-chart-type callback.
          if state.main_cb(state, chart_vars, places,
                           ChartOriginType.PRIMARY_CHART):
            found = True
          else:
            utils.update_counter(state.uttr.counters,
                                 'failed_populate_callback_primary', 1)

    # Infer comparison charts with extended SVs.
    extended_svs = sv2extensions.get(exist_state.sv, [])
    if not extended_svs:
      continue
    exist_svs = exist_state.extended_exist_svs
    if len(exist_svs) > 1:
      exist_svs_key = ''.join(sorted(exist_svs))
      if exist_svs_key in printed_sv_extensions:
        continue
      printed_sv_extensions.add(exist_svs_key)

      # Add the chart in a separate block.
      state.block_id += 1
      chart_vars = ChartVars(svs=exist_svs, block_id=state.block_id)

      # Add this as a secondary chart.
      if state.main_cb(state, chart_vars, places,
                       ChartOriginType.SECONDARY_CHART):
        found = True
      else:
        utils.update_counter(state.uttr.counters,
                             'failed_populate_callback_secondary', 1)

  logging.info("Add chart %s %s returning %r" %
               (', '.join(_get_place_names(places)), svs, found))
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

    utils.update_counter(state.uttr.counters, 'topics_processed',
                         {sv: {
                             'svs': just_svs,
                             'peer_groups': svpgs,
                         }})
    return charts

  return []


# Takes a list of ordered vars which may contain SV and topic,
# opens up "highly ranked" topics into SVs and returns it
# ordered.
def open_top_topics_ordered(svs: List[str], counters: Dict) -> List[str]:
  opened_svs = []
  sv_set = set()
  for rank, var in enumerate(svs):
    for sv in _open_topic_in_var(var, rank, counters):
      if sv not in sv_set:
        opened_svs.append(sv)
        sv_set.add(sv)
  return opened_svs


def _open_topic_in_var(sv: str, rank: int, counters: Dict) -> List[str]:
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

    utils.update_counter(counters, 'topics_processed',
                         {sv: {
                             'svs': just_svs,
                             'peer_groups': svpgs,
                         }})

    return svs

  return []


def handle_contained_in_across(state: PopulateState, places: List[Place]):
  if utils.get_contained_in_type(
      state.uttr) == ContainedInPlaceType.ACROSS and len(places) == 1:
    state.place_type = utils.get_default_child_place_type(places[0])
    utils.update_counter(state.uttr.counters, 'contained_in_across_fallback',
                         state.place_type.value)


def get_default_contained_in_place(state: PopulateState) -> Place:
  if state.uttr.places or not state.place_type:
    return None
  ptype = state.place_type
  if isinstance(ptype, str):
    ptype = ContainedInPlaceType(ptype)
  return constants.DEFAULT_PARENT_PLACES.get(ptype, None)
