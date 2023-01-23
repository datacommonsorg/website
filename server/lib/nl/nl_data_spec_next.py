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
from typing import Dict, List
import logging
from enum import Enum

from lib.nl.nl_detection import ClassificationType, Detection, NLClassifier, Place, ContainedInPlaceType, ContainedInClassificationAttributes, RankingType, RankingClassificationAttributes
from lib.nl import nl_variable, nl_topic
from lib.nl.nl_utterance import Utterance, ChartOriginType, ChartSpec, ChartType, CNTXT_LOOKBACK_LIMIT
import services.datacommons as dc

# We will ignore SV detections that are below this threshold
SV_THRESHOLD = 0.5

# Number of variables to plot in a chart (largely Timeline chart)
_MAX_VARS_PER_CHART = 5

# TODO: If we get the SV from context and the places are different, then old code performs
#       comparison.
# 
def compute(query_detection: Detection, currentUtterance: Utterance):
  uttr = Utterance(prev_utterance=currentUtterance,
                   query=query_detection.original_query,
                   query_type=query_detection.query_type,
                   detection=query_detection,
                   places=[],
                   classifications=query_detection.classifications,
                   svs=filterSVs(query_detection.svs_detected.sv_dcids,                                 
                                 query_detection.svs_detected.sv_scores),
                   chartCandidates=[],
                   rankedCharts=[],
                   answerPlaces=[])

  if (uttr.query_type == ClassificationType.UNKNOWN):
    uttr.query_type = queryTypeFromContext(uttr)
    
  if (query_detection.places_detected):
    uttr.places.append(query_detection.places_detected.main_place)

  logging.info(uttr.query_type)

  # each of these has its own handler. Each knows what arguments it needs and will
  # call on context routines to obtain missing arguments
  if (uttr.query_type == ClassificationType.SIMPLE):
    populateSimple(uttr)
  elif (uttr.query_type == ClassificationType.CORRELATION):
    populateCorrelation(uttr)
  elif (uttr.query_type == ClassificationType.CONTAINED_IN):
    populateContainedIn(uttr)
  elif (uttr.query_type == ClassificationType.RANKING):
    populateRanking(uttr)

  rankCharts(uttr)
  return uttr

@dataclass
class PopulateState:
  uttr: Utterance
  main_cb: any
  fallback_cb: any
  place_type: ContainedInPlaceType = None
  ranking_types: List[RankingType] = field(default_factory=list)
  block_id: int = 0

# Handler for simple charts  

def populateSimple(uttr):
  return populateCharts(PopulateState(uttr=uttr,
                                      main_cb=populateSimpleCb,
                                      fallback_cb=fallbackSimpleCb))

def populateSimpleCb(state, chart_vars, place, chart_origin):
  return addChartToUtterance(ChartType.TIMELINE_CHART, state, chart_vars, [place], chart_origin)
  
def fallbackSimpleCb(state, place, chart_origin):
  # If NO SVs were found, then this is a OVERVIEW chart.
  state.block_id += 1
  chart_vars = ChartVars(svs=[], block_id=state.block_id, include_percapita=False)
  return addChartToUtterance(ChartType.PLACE_OVERVIEW, state, chart_vars, [place], chart_origin)


# Handlers for containedInPlace 

def populateContainedIn(uttr):
  classifications = classificationsOfTypeFromContext(uttr, ClassificationType.CONTAINED_IN)
  for classification in classifications:
    if not classification or not isinstance(classification.attributes, ContainedInClassificationAttributes):
      continue
    place_type = classification.attributes.contained_in_place_type
    if populateCharts(PopulateState(uttr=uttr,
                                    main_cb=populateContainedInCb,
                                    fallback_cb=fallbackContainedInCb,
                                    place_type=place_type)):
      return True
  place_type = ContainedInPlaceType.COUNTY  # poor default. should do this based on main place
  return populateCharts(PopulateState(uttr=uttr,
                                      main_cb=populateContainedInCb,
                                      fallback_cb=fallbackContainedInCb,
                                      place_type=place_type))


def populateContainedInCb(state, chart_vars, containing_place, chart_origin):
  if not state.place_type:
    return False
  if not chart_vars:
    return False
  if len(chart_vars.svs) > 1:
    # We don't handle peer group SVs
    return False
  addChartToUtterance(ChartType.MAP_CHART, state, chart_vars, [containing_place], chart_origin)
  return True


def fallbackContainedInCb(state, containing_place, chart_origin):
  # TODO: Poor choice, do better.
  sv = "Count_Person"
  state.block_id += 1
  chart_vars = ChartVars(svs=[sv], block_id=state.block_id)
  return populateContainedInCb(state, containing_place, chart_origin)


# Handlers for Ranking

def populateRanking(uttr):
  # Get all the classifications in the context.
  ranking_classifications = classificationsOfTypeFromContext(uttr, ClassificationType.RANKING)
  contained_classifications = classificationsOfTypeFromContext(uttr, ClassificationType.CONTAINED_IN)

  # Loop in order until we find success.
  for ranking_classification in ranking_classifications:
    if not ranking_classification or not isinstance(ranking_classification.attributes, RankingClassificationAttributes):
      continue
    if not ranking_classification.attributes.ranking_type:
      continue
    ranking_types = ranking_classification.attributes.ranking_type
    for contained_classification in contained_classifications:
      if not contained_classification or not isinstance(contained_classification.attributes, ContainedInClassificationAttributes):
        continue
      place_type = contained_classification.attributes.contained_in_place_type
      if populateCharts(PopulateState(uttr=uttr,
                                      main_cb=populateRankingCb,
                                      fallback_cb=fallbackRankingCb,
                                      place_type=place_type,
                                      ranking_types=ranking_types)):
        return True

  # Fallback
  ranking_types = [RankingType.HIGH]
  place_type = ContainedInPlaceType.COUNTY
  return populateCharts(PopulateState(uttr=uttr,
                                      main_cb=populateRankingCb,
                                      fallback_cb=fallbackRankingCb,
                                      place_type=place_type,
                                      ranking_types=ranking_types))


def populateRankingCb(state, chart_vars, containing_place, chart_origin):
  if not state.place_type or not state.ranking_types:
    return False

  if len(chart_vars.svs) > 1:
    # We don't handle peer group SVs
    return False
  addChartToUtterance(ChartType.RANKING_CHART, state, chart_vars, [containing_place], chart_origin)
  return True


def fallbackRankingCb(state, containing_place, chart_origin):
  # TODO: Poor choice, do better.
  sv = "Count_Person"
  state.block_id += 1
  chart_vars = ChartVars(svs=[sv], block_id=state.block_id)
  return populateRankingCb(state, chart_vars, containing_place, chart_origin)


# Handlers for correlation

def populateCorrelation(uttr: Utterance):
  classifications = classificationsOfTypeFromContext(uttr, ClassificationType.CONTAINED_IN)
  logging.info(classifications)
  for classification in classifications:
    if not classification or not isinstance(classification.attributes, ContainedInClassificationAttributes):
      continue
    place_type = classification.attributes.contained_in_place_type
    if populateCorrelationForPlaceType(PopulateState(uttr=uttr,
                                                     main_cb=None,
                                                     fallback_cb=None,
                                                     place_type=place_type)):
      return True
  return False


def populateCorrelationForPlaceType(state: PopulateState):
  for pl in state.uttr.places:
    if (populateCorrelationForPlace(state, pl)):
        return True
  for pl in placesFromContext(state.uttr):
    if (populateCorrelationForPlace(state, pl)):
        return True
  return False


def populateCorrelationForPlace(state: PopulateState, place):
  # If there is a child place_type, use a child place sample.
  places_to_check = _sample_child_places(place.dcid, state.place_type.value)

  # For this case, we expect a variable to be detected in this `uttr`
  # For this case, we expect a variable to be detected in this `uttr`
  main_svs = _get_only_svs(state.uttr.svs)
  main_svs = svsExistForPlaces(places_to_check, main_svs)
  if not main_svs:
    logging.info('Correlation found no Main SV')
    return False

  # Next, walk up the chain to find all SVs.
  context_svs = []
  svs_set = set()
  for c_svs in svsFromContext(state.uttr):
    for sv in _get_only_svs(c_svs):
      if sv in svs_set:
        continue
      svs_set.add(sv)
      context_svs.append(sv)
  context_svs = svsExistForPlaces(places_to_check, context_svs)
  if not context_svs:
    logging.info('Correlation found no Context SV')
    return False

  logging.info('Correlation Main SVs: %s', ', '.join(main_svs))
  logging.info('Correslation Context SVs: %s', ', '.join(context_svs))
  # Pick a single context SV for the results
  # TODO: Maybe consider more.
  for main_sv in main_svs:
    populateCorrelationChart(state, place, main_sv, context_svs[0])
  return True

def populateCorrelationChart(state, place, sv_1, sv_2):
  state.block_id += 1
  chart_vars = ChartVars(svs=[sv_1, sv_2],
                         block_id=state.block_id,
                         include_percapita=False)
  addChartToUtterance(ChartType.SCATTER_CHART, state, chart_vars, [place], ChartOriginType.PRIMARY_CHART)
    

def fallbackRankingCb(state, containing_place, chart_origin):
  # TODO: Poor choice, do better.
  sv = "Count_Person"
  state.block_id += 1
  chart_vars = ChartVars(svs=[sv], block_id=state.block_id)
  return populateRankingCb(state, chart_vars, containing_place, chart_origin)

# Generic processors that invoke above callbacks

def populateCharts(state: PopulateState) -> bool:
  for pl in state.uttr.places:
    if (populateChartsForPlace(state, pl)):
        return True
  for pl in placesFromContext(state.uttr):
    if (populateChartsForPlace(state, pl)):
        return True
  return False


def populateChartsForPlace(state: PopulateState, place: str) -> bool:
  if (len(state.uttr.svs) > 0):
    foundCharts = addCharts(state, place, state.uttr.svs)
    if foundCharts:
      return True
  for svs in svsFromContext(state.uttr):
    foundCharts = addCharts(state, place, svs)
    if foundCharts:
        return True
  logging.info('Doing fallback for %s - %s',
               place, ', '.join(state.uttr.svs))
  return state.fallback_cb(state, place, ChartOriginType.PRIMARY_CHART)


# TODO: Batch existence check calls
def addCharts(state: PopulateState, place: str, svs: List[str]) -> bool:
  print("Add chart %s %s" % (place.name, svs))

  # If there is a child place_type, use a child place sample.
  places_to_check = [place.dcid]
  if state.place_type:
    places_to_check = _sample_child_places(place.dcid, state.place_type.value)

  sv2extensions = nl_variable.extend_svs(svs)
  printed_sv_extensions = set()

  found = False
  for rank, sv in enumerate(svs):
    # Main SV/Topic.
    chart_vars_list = svgOrTopicToSVs(state, sv, rank) 
    for chart_vars in chart_vars_list:
      exist_svs = svsExistForPlaces(places_to_check, chart_vars.svs)
      if exist_svs:
        chart_vars.svs = exist_svs
        if state.main_cb(state, chart_vars, place, ChartOriginType.PRIMARY_CHART):
          found = True
      else:
        logging.info('Existence check failed for %s - %s', ', '.join(places_to_check), ', '.join(chart_vars.svs))

    # Comparison charts with extended SVs.
    extended_svs = sv2extensions.get(sv, [])
    if not extended_svs:
      continue
    exist_svs = svsExistForPlaces(places_to_check, extended_svs)
    if len(exist_svs) > 1:
      exist_svs_key = ''.join(sorted(exist_svs))
      if exist_svs_key in printed_sv_extensions:
        continue
      printed_sv_extensions.add(exist_svs_key)

      state.block_id += 1
      chart_vars = ChartVars(svs=exist_svs, block_id=state.block_id)
      if state.main_cb(state, chart_vars, place, ChartOriginType.SECONDARY_CHART):
        found = True
    elif len(exist_svs) < len(extended_svs):
      logging.info('Existence check failed for %s - %s', ', '.join(places_to_check), ', '.join(extended_svs))

  return found


# More general utilities

def svsFromContext(uttr):
  ans = []
  prev_uttr_count = 0
  prev = uttr.prev_utterance
  while (prev and prev_uttr_count < CNTXT_LOOKBACK_LIMIT):
    ans.append(prev.svs)
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return ans

def placesFromContext(uttr):
  ans = []
  prev_uttr_count = 0
  prev = uttr.prev_utterance
  while (prev and prev_uttr_count < CNTXT_LOOKBACK_LIMIT):
    for place in prev.places:
      ans.append(place)
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return ans

def queryTypeFromContext(uttr):
  # this needs to be made a lot smarter ...
  prev_uttr_count = 0
  prev = uttr.prev_utterance
  while (prev and prev_uttr_count < CNTXT_LOOKBACK_LIMIT):
    if (not (prev.query_type == ClassificationType.UNKNOWN)):
        return prev.query_type
    prev = prev.prev_utterance
    prev_uttr_count = prev_uttr_count + 1
  return ClassificationType.SIMPLE


def classificationsOfTypeFromContext(uttr, ctype):
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


# Struct for configuring the vars that go into a chart.
@dataclass
class ChartVars:
  svs: List[str]
  block_id: int
  include_percapita: bool = True
  title: str = ""

# Returns a list of ChartVars.  Inner list may contain a single SV or a peer-group of SVs.
def svgOrTopicToSVs(state: PopulateState, sv: str, rank: int) -> List[ChartVars]:
  if isSV(sv):
    state.block_id += 1
    return [ChartVars(svs=[sv], block_id=state.block_id)]
  if isTopic(sv):
    topic_vars = nl_topic.get_topic_vars(sv, rank)
    peer_groups = nl_topic.get_topic_peers(topic_vars)
    just_svs = []
    svpgs = []
    for v in topic_vars:
      if v in peer_groups and peer_groups[v]:
        title = nl_topic.svpg_name(v)
        svpgs.append((title, peer_groups[v]))
      else:
        just_svs.append(v)
    # Make a block with one chart per SV in just_svs
    state.block_id += 1
    charts = []
    for v in just_svs:
      # Skip PC for this case.
      charts.append(ChartVars(svs=[v], block_id=state.block_id, include_percapita=False))
    # Next, make one block per peer-group
    for (title, svpg) in svpgs:
      state.block_id += 1
      charts.append(ChartVars(svs=svpg, block_id=state.block_id, include_percapita=False, title=title))
    return charts
  return []
          
      
def rankCharts (utterance):
  for chart in utterance.chartCandidates:
    print("Chart: %s %s\n" % (chart.places, chart.svs))
  utterance.rankedCharts = utterance.chartCandidates


# Returns a map of existing SVs (as a union of places).  The returned map always has keys for places.
def svsExistForPlaces(places, svs):
  # Initialize return value
  place2sv = {}
  for p in places:
    place2sv[p] = []

  if not svs:
    return place2sv

  sv_existence = dc.observation_existence(svs, places)
  if not sv_existence:
    logging.error("Existence checks for SVs failed.")
    return place2sv

  existing_svs = set()
  for sv in svs:
    for place, exist in sv_existence['variable'][sv]['entity'].items():
      if not exist:
        continue
      existing_svs.add(sv)

  return list(existing_svs)


def isTopic(sv):
  return sv.startswith("dc/topic/")


def isSVG(sv):
  return sv.startswith("dc/g/")


def isSV(sv):
  return not (isTopic(sv) or isSVG(sv))


def addChartToUtterance(chart_type, state, chart_vars, places, primary_vs_secondary):
  if state.place_type and isinstance(state.place_type, ContainedInPlaceType):
    # TODO: What's the flow where the instance is string?
    state.place_type = state.place_type.value

  attr = {
    "class" : primary_vs_secondary,
    "place_type" : state.place_type,
    "ranking_types": state.ranking_types,
    "block_id": chart_vars.block_id,
    "include_percapita": chart_vars.include_percapita,
    "title": chart_vars.title,
  }
  if len(chart_vars.svs) < 2 or chart_type == ChartType.SCATTER_CHART:
    ch = ChartSpec(chart_type=chart_type, svs=chart_vars.svs, places=places, utterance=state.uttr, attr=attr)
    state.uttr.chartCandidates.append(ch)
    return True

  assert chart_type == ChartType.TIMELINE_CHART  # This is now only supported in time-line

  start_index = 0
  while start_index < len(chart_vars.svs):
    l = min(len(chart_vars.svs) - start_index, _MAX_VARS_PER_CHART)
    ch = ChartSpec(chart_type=chart_type,
                   svs=chart_vars.svs[start_index:start_index+l],
                   places=places,
                   utterance=state.uttr,
                   attr=attr)
    start_index += l
    state.uttr.chartCandidates.append(ch)
  return True



# random util, should go away soon
def filterSVs (sv_list, sv_score):
  # this functionality should be moved to detection.
  i = 0
  ans = []
  while (i < len(sv_list)):
    if (sv_score[i] > SV_THRESHOLD):
      ans.append(sv_list[i])
    i = i + 1
  return ans


def _get_only_svs(svs):
  ret = []
  for sv in svs:
    if isSV(sv):
      ret.append(sv)
  return ret

_NUM_CHILD_PLACES_FOR_EXISTENCE = 20

# TODO: dedupe with nl_data_spec.py
def _sample_child_places(main_place_dcid, contained_place_type):
  """Find a sampled child place"""
  logging.info('_sample_child_place: for %s - %s', main_place_dcid, contained_place_type)
  if not contained_place_type:
    return None
  if contained_place_type == "City":
    return "geoId/0667000"
  child_places = dc.get_places_in([main_place_dcid], contained_place_type)
  if child_places.get(main_place_dcid):
    logging.info('_sample_child_place returning %s',
                 ', '.join(child_places[main_place_dcid][:_NUM_CHILD_PLACES_FOR_EXISTENCE]))
    return child_places[main_place_dcid][:_NUM_CHILD_PLACES_FOR_EXISTENCE]
  else:
    triples = dc.triples(main_place_dcid, 'in').get('triples')
    if triples:
      for prop, nodes in triples.items():
        if prop != 'containedInPlace' and prop != 'geoOverlaps':
          continue
        child_places = []
        for node in nodes['nodes']:
          if contained_place_type in node['types']:
            child_places.append(node['dcid'])
        if child_places:
          logging.info('_sample_child_place returning %s',
                       ', '.join(child_places[:_NUM_CHILD_PLACES_FOR_EXISTENCE]))
          return child_places[:_NUM_CHILD_PLACES_FOR_EXISTENCE]
  logging.info('_sample_child_place returning %s', main_place_dcid)
  return [main_place_dcid]
