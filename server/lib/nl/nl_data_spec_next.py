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

from dataclasses import dataclass, field
from typing import List
import logging

from lib.nl.nl_detection import ClassificationType, Detection, \
  ContainedInPlaceType, ContainedInClassificationAttributes, \
    RankingType, RankingClassificationAttributes, Place, \
      ClassificationAttributes
from lib.nl import nl_variable, nl_topic
from lib.nl.nl_utils import is_sv, is_topic, \
  sv_existence_for_places, get_sample_child_places
from lib.nl.nl_utterance import Utterance, ChartOriginType, ChartSpec, \
  ChartType, CNTXT_LOOKBACK_LIMIT

# We will ignore SV detections that are below this threshold
_SV_THRESHOLD = 0.5

# Number of variables to plot in a chart (largely Timeline chart)
_MAX_VARS_PER_CHART = 5


#
# Compute a new Utterance given the classifications for a user query
# and past utterances.
#
def compute(query_detection: Detection,
            currentUtterance: Utterance) -> Utterance:
  # Construct Utterance datastructure.
  uttr = Utterance(prev_utterance=currentUtterance,
                   query=query_detection.original_query,
                   query_type=query_detection.query_type,
                   detection=query_detection,
                   places=[],
                   classifications=query_detection.classifications,
                   svs=filter_svs(query_detection.svs_detected.sv_dcids,
                                  query_detection.svs_detected.sv_scores),
                   chartCandidates=[],
                   rankedCharts=[],
                   answerPlaces=[])

  # If we could not detect query_type from user-query, infer from past context.
  if (uttr.query_type == ClassificationType.UNKNOWN):
    uttr.query_type = _query_type_from_context(uttr)
  logging.info(uttr.query_type)

  # Add detected places.
  if (query_detection.places_detected):
    uttr.places.append(query_detection.places_detected.main_place)

  # Each query-type has its own handler. Each knows what arguments it needs and
  # will call on the *_from_context() routines to obtain missing arguments.
  #
  # TODO: Support COMPARE type.
  if (uttr.query_type == ClassificationType.SIMPLE):
    populate_simple(uttr)
  elif (uttr.query_type == ClassificationType.CORRELATION):
    populate_correlation(uttr)
  elif (uttr.query_type == ClassificationType.CONTAINED_IN):
    populate_contained_in(uttr)
  elif (uttr.query_type == ClassificationType.RANKING):
    populate_ranking(uttr)

  rank_charts(uttr)
  return uttr


# Generic "populate" processor that process SIMPLE, CONTAINED_IN and RANKING
# chart types and invoke custom callbacks.


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


# Populate chart specs in state.uttr and return True if something was added.
def populate_charts(state: PopulateState) -> bool:
  for pl in state.uttr.places:
    if (_populate_charts_for_place(state, pl)):
      return True
  for pl in _places_from_context(state.uttr):
    if (_populate_charts_for_place(state, pl)):
      return True
  return False


# Populate charts given a place.
def _populate_charts_for_place(state: PopulateState, place: str) -> bool:
  if (len(state.uttr.svs) > 0):
    foundCharts = _add_charts(state, place, state.uttr.svs)
    if foundCharts:
      return True
  for svs in _svs_from_context(state.uttr):
    foundCharts = _add_charts(state, place, svs)
    if foundCharts:
      return True
  logging.info('Doing fallback for %s - %s', place, ', '.join(state.uttr.svs))
  return state.fallback_cb(state, place, ChartOriginType.PRIMARY_CHART)


# Add charts given a place and a list of stat-vars.
# TODO: Batch existence check calls
def _add_charts(state: PopulateState, place: Place, svs: List[str]) -> bool:
  print("Add chart %s %s" % (place.name, svs))

  # If there is a child place_type, get child place samples for existence check.
  places_to_check = [place.dcid]
  if state.place_type:
    places_to_check = get_sample_child_places(place.dcid,
                                              state.place_type.value)

  # Map of main SV -> peer SVs
  sv2extensions = nl_variable.extend_svs(svs)

  # A set used to ensure that a set of SVs are constructed into charts
  # only once. For example SV1 and SV2 may both be main SVs, and part of
  # the peer-group.  In that case, the peer-group is processed only once.
  printed_sv_extensions = set()

  found = False
  for rank, sv in enumerate(svs):

    # Infer charts for the main SV/Topic.
    chart_vars_list = svg_or_topic_to_svs(state, sv, rank)
    for chart_vars in chart_vars_list:
      exist_svs = sv_existence_for_places(places_to_check, chart_vars.svs)
      if exist_svs:
        chart_vars.svs = exist_svs
        # Now that we've found existing vars, call the per-chart-type callback.
        if state.main_cb(state, chart_vars, place,
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
      if state.main_cb(state, chart_vars, place,
                       ChartOriginType.SECONDARY_CHART):
        found = True
    elif len(exist_svs) < len(extended_svs):
      logging.info('Existence check failed for %s - %s',
                   ', '.join(places_to_check), ', '.join(extended_svs))

  return found


# Callback handlers for SIMPLE charts


def populate_simple(uttr: Utterance) -> bool:
  return populate_charts(
      PopulateState(uttr=uttr,
                    main_cb=_populate_simple_cb,
                    fallback_cb=_fallback_simple_cb))


def _populate_simple_cb(state: PopulateState, chart_vars: ChartVars,
                        place: Place, chart_origin: ChartOriginType) -> bool:
  return _add_chart_to_utterance(ChartType.TIMELINE_CHART, state, chart_vars,
                                 [place], chart_origin)


def _fallback_simple_cb(state: PopulateState, place: Place,
                        chart_origin: ChartOriginType) -> bool:
  # If NO SVs were found, then this is a OVERVIEW chart, added to a new block.
  state.block_id += 1
  chart_vars = ChartVars(svs=[],
                         block_id=state.block_id,
                         include_percapita=False)
  return _add_chart_to_utterance(ChartType.PLACE_OVERVIEW, state, chart_vars,
                                 [place], chart_origin)


# Callback handlers for CONTAINED_IN chart


def populate_contained_in(uttr: Utterance) -> bool:
  # Loop over all CONTAINED_IN classifications (from current to past) in order.
  classifications = _classifications_of_type_from_context(
      uttr, ClassificationType.CONTAINED_IN)
  for classification in classifications:
    if (not classification or not isinstance(
        classification.attributes, ContainedInClassificationAttributes)):
      continue
    place_type = classification.attributes.contained_in_place_type
    if populate_charts(
        PopulateState(uttr=uttr,
                      main_cb=_populate_contained_in_cb,
                      fallback_cb=_fallback_contained_in_cb,
                      place_type=place_type)):
      return True
  # TODO: poor default; should do this based on main place
  place_type = ContainedInPlaceType.COUNTY
  return populate_charts(
      PopulateState(uttr=uttr,
                    main_cb=_populate_contained_in_cb,
                    fallback_cb=_fallback_contained_in_cb,
                    place_type=place_type))


def _populate_contained_in_cb(state: PopulateState, chart_vars: ChartVars,
                              containing_place: Place,
                              chart_origin: ChartOriginType) -> bool:
  if not state.place_type:
    return False
  if not chart_vars:
    return False
  if len(chart_vars.svs) > 1:
    # We don't handle peer group SVs
    return False
  _add_chart_to_utterance(ChartType.MAP_CHART, state, chart_vars,
                          [containing_place], chart_origin)
  return True


def _fallback_contained_in_cb(state: PopulateState, containing_place: Place,
                              chart_origin: ChartOriginType) -> bool:
  # TODO: Poor choice, do better.
  sv = "Count_Person"
  state.block_id += 1
  chart_vars = ChartVars(svs=[sv], block_id=state.block_id)
  return _populate_contained_in_cb(state, chart_vars, containing_place,
                                   chart_origin)


# Callback handlers for RANKING chart


def populate_ranking(uttr: Utterance):
  # Get all RANKING classifications in the context.
  ranking_classifications = _classifications_of_type_from_context(
      uttr, ClassificationType.RANKING)
  # Get all CONTAINED_IN classifications in the context.
  contained_classifications = _classifications_of_type_from_context(
      uttr, ClassificationType.CONTAINED_IN)

  # Loop over all ranking classifications.
  for ranking_classification in ranking_classifications:
    if (not ranking_classification or not isinstance(
        ranking_classification.attributes, RankingClassificationAttributes)):
      continue
    if not ranking_classification.attributes.ranking_type:
      continue
    ranking_types = ranking_classification.attributes.ranking_type
    # For every ranking classification, loop over contained-in classification,
    # and call populate_charts()
    for contained_classification in contained_classifications:
      if (not contained_classification or
          not isinstance(contained_classification.attributes,
                         ContainedInClassificationAttributes)):
        continue
      place_type = contained_classification.attributes.contained_in_place_type
      if populate_charts(
          PopulateState(uttr=uttr,
                        main_cb=_populate_ranking_cb,
                        fallback_cb=_fallback_ranking_cb,
                        place_type=place_type,
                        ranking_types=ranking_types)):
        return True

  # Fallback
  ranking_types = [RankingType.HIGH]
  place_type = ContainedInPlaceType.COUNTY
  return populate_charts(
      PopulateState(uttr=uttr,
                    main_cb=_populate_ranking_cb,
                    fallback_cb=_fallback_ranking_cb,
                    place_type=place_type,
                    ranking_types=ranking_types))


def _populate_ranking_cb(state: PopulateState, chart_vars: ChartVars,
                         containing_place: Place,
                         chart_origin: ChartOriginType) -> bool:
  if not state.place_type or not state.ranking_types:
    return False

  if len(chart_vars.svs) > 1:
    # We don't handle peer group SVs
    return False
  _add_chart_to_utterance(ChartType.RANKING_CHART, state, chart_vars,
                          [containing_place], chart_origin)
  return True


def _fallback_ranking_cb(state: PopulateState, containing_place: Place,
                         chart_origin: ChartOriginType) -> bool:
  # TODO: Poor choice, do better.
  sv = "Count_Person"
  state.block_id += 1
  chart_vars = ChartVars(svs=[sv], block_id=state.block_id)
  return _populate_ranking_cb(state, chart_vars, containing_place, chart_origin)


#
# Handler for CORRELATION chart.  This does not use the populate_charts() logic
# because it is sufficiently different, requiring identifying pairs of SVs.
#


def populate_correlation(uttr: Utterance) -> bool:
  # Get the list of CONTAINED_IN classifications in order from current to past.
  classifications = _classifications_of_type_from_context(
      uttr, ClassificationType.CONTAINED_IN)
  logging.info(classifications)
  for classification in classifications:
    if (not classification or not isinstance(
        classification.attributes, ContainedInClassificationAttributes)):
      continue
    place_type = classification.attributes.contained_in_place_type
    if _populate_correlation_for_place_type(
        PopulateState(uttr=uttr,
                      main_cb=None,
                      fallback_cb=None,
                      place_type=place_type)):
      return True
  return False


def _populate_correlation_for_place_type(state: PopulateState) -> bool:
  for pl in state.uttr.places:
    if (_populate_correlation_for_place(state, pl)):
      return True
  for pl in _places_from_context(state.uttr):
    if (_populate_correlation_for_place(state, pl)):
      return True
  return False


def _populate_correlation_for_place(state: PopulateState, place: Place) -> bool:
  # Get child place samples for existence check.
  places_to_check = get_sample_child_places(place.dcid, state.place_type.value)

  # For the main SV of correlation, we expect a variable to
  # be detected in this `uttr`
  main_svs = _get_only_svs(state.uttr.svs)
  main_svs = sv_existence_for_places(places_to_check, main_svs)
  if not main_svs:
    logging.info('Correlation found no Main SV')
    return False

  # For related SV, walk up the chain to find all SVs.
  context_svs = []
  svs_set = set()
  for c_svs in _svs_from_context(state.uttr):
    for sv in _get_only_svs(c_svs):
      if sv in svs_set:
        continue
      svs_set.add(sv)
      context_svs.append(sv)
  context_svs = sv_existence_for_places(places_to_check, context_svs)
  if not context_svs:
    logging.info('Correlation found no Context SV')
    return False

  logging.info('Correlation Main SVs: %s', ', '.join(main_svs))
  logging.info('Correslation Context SVs: %s', ', '.join(context_svs))

  # Pick a single context SV for the results
  # TODO: Maybe consider more.
  found = False
  for main_sv in main_svs:
    found |= _populate_correlation_chart(state, place, main_sv, context_svs[0])
  return found


def _populate_correlation_chart(state: PopulateState, place: Place, sv_1: str,
                                sv_2: str) -> bool:
  state.block_id += 1
  chart_vars = ChartVars(svs=[sv_1, sv_2],
                         block_id=state.block_id,
                         include_percapita=False)
  return _add_chart_to_utterance(ChartType.SCATTER_CHART, state, chart_vars,
                                 [place], ChartOriginType.PRIMARY_CHART)


#
# General utilities for retrieving stuff from past context.
#


def _svs_from_context(uttr: Utterance) -> List[str]:
  ans = []
  prev_uttr_count = 0
  prev = uttr.prev_utterance
  while (prev and prev_uttr_count < CNTXT_LOOKBACK_LIMIT):
    ans.append(prev.svs)
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return ans


def _places_from_context(uttr: Utterance) -> List[Place]:
  ans = []
  prev_uttr_count = 0
  prev = uttr.prev_utterance
  while (prev and prev_uttr_count < CNTXT_LOOKBACK_LIMIT):
    for place in prev.places:
      ans.append(place)
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return ans


def _query_type_from_context(uttr: Utterance) -> List[ClassificationType]:
  # this needs to be made a lot smarter ...
  prev_uttr_count = 0
  prev = uttr.prev_utterance
  while (prev and prev_uttr_count < CNTXT_LOOKBACK_LIMIT):
    if (not (prev.query_type == ClassificationType.UNKNOWN)):
      return prev.query_type
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return ClassificationType.SIMPLE


def _classifications_of_type_from_context(
    uttr: Utterance,
    ctype: ClassificationType) -> List[ClassificationAttributes]:
  result = []
  for cl in uttr.classifications:
    if (cl.type == ctype):
      result.append(cl)
  prev_uttr_count = 0
  prev = uttr.prev_utterance
  while (prev and prev_uttr_count < CNTXT_LOOKBACK_LIMIT):
    for cl in prev.classifications:
      if (cl.type == ctype):
        result.append(cl)
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return result


#
# Returns a list of ChartVars, where each ChartVars may be a single SV or
# group of SVs.
#


def svg_or_topic_to_svs(state: PopulateState, sv: str,
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


#
# Base helper to add a chart spec to an utterance.
#
def _add_chart_to_utterance(chart_type: ChartType, state: PopulateState,
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
  if len(chart_vars.svs) < 2 or chart_type == ChartType.SCATTER_CHART:
    ch = ChartSpec(chart_type=chart_type,
                   svs=chart_vars.svs,
                   places=places,
                   utterance=state.uttr,
                   attr=attr)
    state.uttr.chartCandidates.append(ch)
    return True

  # This is now only supported in time-line
  assert chart_type == ChartType.TIMELINE_CHART

  start_index = 0
  while start_index < len(chart_vars.svs):
    l = min(len(chart_vars.svs) - start_index, _MAX_VARS_PER_CHART)
    ch = ChartSpec(chart_type=chart_type,
                   svs=chart_vars.svs[start_index:start_index + l],
                   places=places,
                   utterance=state.uttr,
                   attr=attr)
    start_index += l
    state.uttr.chartCandidates.append(ch)
  return True


#
# Rank candidate charts in the given Utterance.
#
# TODO: Maybe improve in future.
def rank_charts(utterance: Utterance):
  for chart in utterance.chartCandidates:
    print("Chart: %s %s\n" % (chart.places, chart.svs))
  utterance.rankedCharts = utterance.chartCandidates


#
# Filter out SVs that are below a score.
#
def filter_svs(sv_list: List[str], sv_score: List[float]) -> List[str]:
  # this functionality should be moved to detection.
  i = 0
  ans = []
  while (i < len(sv_list)):
    if (sv_score[i] > _SV_THRESHOLD):
      ans.append(sv_list[i])
    i = i + 1
  return ans


def _get_only_svs(svs: List[str]) -> List[str]:
  ret = []
  for sv in svs:
    if is_sv(sv):
      ret.append(sv)
  return ret
