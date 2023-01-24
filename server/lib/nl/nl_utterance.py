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
# Utterance data structure and associate libraries
#

import logging

from typing import List, Dict

from dataclasses import dataclass
from enum import IntEnum
from lib.nl.nl_detection import ContainedInPlaceType, ClassificationType, RankingType, \
  Detection, NLClassifier, Place, RankingClassificationAttributes, \
    ContainedInClassificationAttributes, SimpleClassificationAttributes

# How far back does the context go back.
CNTXT_LOOKBACK_LIMIT = 5


# Forward declaration since Utterance contains a pointer to itself.
class Utterance:
  pass


# Primary charts are about variables/places directly requested by the user.
# Secondary charts are ones about expansions of the primary variables/places.
class ChartOriginType(IntEnum):
  PRIMARY_CHART = 0
  SECONDARY_CHART = 1


# Type of chart.
class ChartType(IntEnum):
  TIMELINE_CHART = 0
  MAP_CHART = 1
  RANKING_CHART = 2
  BAR_CHART = 3
  PLACE_OVERVIEW = 4
  SCATTER_CHART = 5


# Enough of a spec per chart to create the chart config proto.
@dataclass
class ChartSpec:
  chart_type: ChartType
  utterance: Utterance
  places: List[Place]
  svs: List[str]
  # A list of key-value attributes interpreted per chart_type
  attr: Dict


# The main Utterance data structure that represents all state
# associated with a user issued query. The past utterances
# form the context saved in the client and shipped to the server.
@dataclass
class Utterance:
  # Linked list of past utterances
  prev_utterance: Utterance
  # Unmodified user-issued query
  query: str
  # Result of classification
  detection: Detection
  # A characterization of the query
  query_type: ClassificationType
  # Primary places
  places: List[Place]
  # Primary variables
  svs: List[str]
  # List of detected classifications
  classifications: List[NLClassifier]
  # Computed chart candidates.
  chartCandidates: List[ChartSpec]
  # Final ranked charts from which Chart Config proto is generated.
  rankedCharts: List[ChartSpec]
  # This is a list of places in the answer
  # (e.g., top earthquake prone CA counties)
  # TODO: Fill this up
  answerPlaces: List[str]


#
# Helper functions for serializing/deserializing Utterance
#


def _save_places(places: List[Place]) -> List[Dict]:
  places_dict = []
  for p in places:
    pdict = {}
    pdict['dcid'] = p.dcid
    pdict['name'] = p.name
    pdict['place_type'] = p.place_type
    places_dict.append(pdict)
  return places_dict


def _load_places(places_dict: List[Dict]) -> List[Place]:
  places = []
  for pdict in places_dict:
    places.append(
        Place(dcid=pdict['dcid'],
              name=pdict['name'],
              place_type=pdict['place_type']))
  return places


def _save_classifications(classifications: List[NLClassifier]) -> List[Dict]:
  classifications_dict = []
  for c in classifications:
    cdict = {}
    cdict['type'] = c.type

    if isinstance(c.attributes, ContainedInClassificationAttributes):
      cip = c.attributes.contained_in_place_type
      if isinstance(cip, ContainedInPlaceType):
        cdict['contained_in_place_type'] = cip.value
      else:
        cdict['contained_in_place_type'] = cip
    elif isinstance(c.attributes, RankingClassificationAttributes):
      cdict['ranking_type'] = c.attributes.ranking_type

    classifications_dict.append(cdict)
  return classifications_dict


def _load_classifications(
    classifications_dict: List[Dict]) -> List[NLClassifier]:
  classifications = []
  for cdict in classifications_dict:
    attributes = SimpleClassificationAttributes()
    if 'contained_in_place_type' in cdict:
      attributes = ContainedInClassificationAttributes(
          contained_in_place_type=ContainedInPlaceType(
              cdict['contained_in_place_type']))
    elif 'ranking_type' in cdict:
      attributes = RankingClassificationAttributes(
          ranking_type=[RankingType(r) for r in cdict['ranking_type']],
          ranking_trigger_words=[])
    classifications.append(
        NLClassifier(type=ClassificationType(cdict['type']),
                     attributes=attributes))
  return classifications


def _save_charts(charts: List[ChartSpec]) -> List[Dict]:
  charts_dict = []
  for c in charts:
    cdict = {}
    cdict['chart_type'] = c.chart_type
    cdict['places'] = _save_places(c.places)
    cdict['svs'] = c.svs
    cdict['attr'] = c.attr
    charts_dict.append(cdict)
  return charts_dict


def _load_charts(charts_dict: List[Dict]) -> List[ChartSpec]:
  charts = []
  for cdict in charts_dict:
    charts.append(
        ChartSpec(chart_type=ChartType(cdict['chart_type']),
                  places=_load_places(cdict['places']),
                  svs=cdict['svs'],
                  attr=cdict['attr'],
                  utterance=None))
  return charts


# Given the latest Utterance, saves the full list of utterances into a
# dict.  The latest utterance is in the front.
def save_utterance(uttr: Utterance) -> List[Dict]:
  uttr_dicts = []
  u = uttr
  cnt = 0
  while u and cnt < CNTXT_LOOKBACK_LIMIT:
    udict = {}
    udict['query'] = u.query
    udict['query_type'] = u.query_type
    udict['svs'] = u.svs
    udict['places'] = _save_places(u.places)
    udict['classifications'] = _save_classifications(u.classifications)
    udict['ranked_charts'] = _save_charts(u.rankedCharts)
    uttr_dicts.append(udict)
    u = u.prev_utterance
    cnt += 1

  return uttr_dicts


# Given a list of dicts previously saved by `save_utterance()`, loads
# them into Utterance structures and returns the latest one.
def load_utterance(uttr_dicts: List[Dict]) -> Utterance:
  if len(uttr_dicts) > CNTXT_LOOKBACK_LIMIT:
    logging.error('Too many past utterances found: ', len(uttr_dicts))

  uttr = None
  prev_uttr = None
  for i in range(len(uttr_dicts)):
    udict = uttr_dicts[len(uttr_dicts) - 1 - i]
    uttr = Utterance(prev_utterance=prev_uttr,
                     query=udict['query'],
                     query_type=ClassificationType(udict['query_type']),
                     svs=udict['svs'],
                     places=_load_places(udict['places']),
                     classifications=_load_classifications(
                         udict['classifications']),
                     rankedCharts=_load_charts(udict['ranked_charts']),
                     detection=None,
                     chartCandidates=None,
                     answerPlaces=None)
    prev_uttr = uttr
  return uttr
