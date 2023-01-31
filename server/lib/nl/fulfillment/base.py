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

import logging

from dataclasses import dataclass, field
from typing import List

from lib.nl import nl_variable, nl_topic
from lib.nl.nl_utterance import ChartType, ChartOriginType, ChartSpec, Utterance
from lib.nl.nl_detection import ContainedInPlaceType, Place, RankingType
from lib.nl.fulfillment import context
from lib.nl.nl_utils import sv_existence_for_places, get_sample_child_places, \
  get_only_svs, is_sv, is_topic


# Data structure to store state for a single "populate" call.
@dataclass
class PopulateState:
  uttr: Utterance
  main_cb: any
  fallback_cb: any
  place_type: ContainedInPlaceType = None
  ranking_types: List[RankingType] = field(default_factory=list)
  block_id: int = 0


# Data structure for configuring the vars that go into a chart.
@dataclass
class ChartVars:
  svs: List[str]
  # Represents a grouping of charts on the resulting display.
  block_id: int
  include_percapita: bool = True
  title: str = ""


#
# Base helper to add a chart spec to an utterance.
#
def add_chart_to_utterance(chart_type: ChartType, state: PopulateState,
                           chart_vars: ChartVars, places: List[Place],
                           primary_vs_secondary: ChartOriginType) -> bool:
  if state.place_type and isinstance(state.place_type, ContainedInPlaceType):
    # TODO: What's the flow where the instance is string?
    state.place_type = state.place_type.value

  attr = {
      "class": primary_vs_secondary,
      "place_type": state.place_type,
      "ranking_types": state.ranking_types,
      "block_id": chart_vars.block_id,
      "include_percapita": chart_vars.include_percapita,
      "title": chart_vars.title,
  }
  ch = ChartSpec(chart_type=chart_type,
                 svs=chart_vars.svs,
                 places=places,
                 utterance=state.uttr,
                 attr=attr)
  state.uttr.chartCandidates.append(ch)
  return True


# Generic "populate" processor that process SIMPLE, CONTAINED_IN and RANKING
# chart types and invoke custom callbacks.


# Populate chart specs in state.uttr and return True if something was added.
def populate_charts(state: PopulateState) -> bool:
  for pl in state.uttr.places:
    if (populate_charts_for_places(state, [pl])):
      return True
  for pl in context.places_from_context(state.uttr):
    if (populate_charts_for_places(state, [pl])):
      return True
  return False


# Populate charts given a place.
def populate_charts_for_places(state: PopulateState,
                               places: List[Place]) -> bool:
  if (len(state.uttr.svs) > 0):
    foundCharts = _add_charts(state, places, state.uttr.svs)
    if foundCharts:
      return True
  for svs in context.svs_from_context(state.uttr):
    foundCharts = _add_charts(state, places, svs)
    if foundCharts:
      return True
  logging.info('Doing fallback for %s - %s',
               ', '.join(_get_place_names(places)), ', '.join(state.uttr.svs))
  return state.fallback_cb(state, places, ChartOriginType.PRIMARY_CHART)


# Add charts given a place and a list of stat-vars.
# TODO: Batch existence check calls
def _add_charts(state: PopulateState, places: List[Place],
                svs: List[str]) -> bool:
  print("Add chart %s %s" % (', '.join(_get_place_names(places)), svs))

  # If there is a child place_type, get child place samples for existence check.
  places_to_check = _get_place_dcids(places)
  if state.place_type:
    # REQUIRES: len(places) == 1
    places_to_check = get_sample_child_places(places[0].dcid,
                                              state.place_type.value)

  # Map of main SV -> peer SVs
  sv2extensions = nl_variable.extend_svs(get_only_svs(svs))

  # A set used to ensure that a set of SVs are constructed into charts
  # only once. For example SV1 and SV2 may both be main SVs, and part of
  # the peer-group.  In that case, the peer-group is processed only once.
  printed_sv_extensions = set()

  found = False
  for rank, sv in enumerate(svs):

    # Infer charts for the main SV/Topic.
    chart_vars_list = _svg_or_topic_to_svs(state, sv, rank)
    for chart_vars in chart_vars_list:
      exist_svs = sv_existence_for_places(places_to_check, chart_vars.svs)
      if exist_svs:
        chart_vars.svs = exist_svs
        # Now that we've found existing vars, call the per-chart-type callback.
        if state.main_cb(state, chart_vars, places,
                         ChartOriginType.PRIMARY_CHART):
          found = True
      else:
        logging.info('Existence check failed for %s - %s',
                     ', '.join(places_to_check), ', '.join(chart_vars.svs))

    # Infer comparison charts with extended SVs.
    extended_svs = sv2extensions.get(sv, [])
    if not extended_svs:
      continue
    exist_svs = sv_existence_for_places(places_to_check, extended_svs)
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
    elif len(exist_svs) < len(extended_svs):
      logging.info('Existence check failed for %s - %s',
                   ', '.join(places_to_check), ', '.join(extended_svs))

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
def _svg_or_topic_to_svs(state: PopulateState, sv: str,
                         rank: int) -> List[ChartVars]:
  if is_sv(sv):
    state.block_id += 1
    return [ChartVars(svs=[sv], block_id=state.block_id)]
  if is_topic(sv):
    topic_vars = nl_topic.get_topic_vars(sv, rank)
    peer_groups = nl_topic.get_topic_peers(topic_vars)

    # Classify into two lists.
    just_svs = []
    svpgs = []
    for v in topic_vars:
      if v in peer_groups and peer_groups[v]:
        title = nl_topic.svpg_name(v)
        svpgs.append((title, peer_groups[v]))
      else:
        just_svs.append(v)

    # Group into blocks carefully:

    # 1. Make a block for all SVs in just_svs
    state.block_id += 1
    charts = []
    for v in just_svs:
      # Skip PC for this case (per prior implementation)
      charts.append(
          ChartVars(svs=[v], block_id=state.block_id, include_percapita=False))

    # 2. Make a block for every peer-group in svpgs
    for (title, svpg) in svpgs:
      state.block_id += 1
      charts.append(
          ChartVars(svs=svpg,
                    block_id=state.block_id,
                    include_percapita=False,
                    title=title))
    return charts

  return []