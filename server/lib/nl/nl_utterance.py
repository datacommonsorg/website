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

from typing import List, Dict

from dataclasses import dataclass
from enum import IntEnum
from lib.nl_detection import ClassificationType, Detection, NLClassifier, Place, RankingClassificationAttributes, ContainedInClassificationAttributes, SimpleClassificationAttributes, ContainedInPlaceType

# How far back do we do
CNTXT_LOOKBACK_LIMIT = 3

class ChartOriginType(IntEnum):
  PRIMARY_CHART = 0
  SECONDARY_CHART = 1

# TODO: Distinguish between multi-place bar vs. multi-var bar?
class ChartType(IntEnum):
  TIMELINE_CHART = 0
  MAP_CHART = 1
  RANKING_CHART = 2
  BAR_CHART = 3
  PLACE_OVERVIEW = 4

class Utterance:
  pass

@dataclass
class ChartSpec:
  chart_type: ChartType
  utterance: Utterance
  # TODO: change this to be just the dcid
  places: List[Place]
  svs: List[str]
  attr: Dict

@dataclass
class Utterance:
  prev_utterance: Utterance
  query: str
  detection: Detection
  query_type: ClassificationType
  # TODO: change this to be just the dcid
  places: List[Place]
  svs: List[str]
  classifications: List[NLClassifier] 
  chartCandidates: List[ChartSpec]
  rankedCharts: List[ChartSpec]
  answerPlaces: List[str]
  

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
    places.append(Place(dcid=pdict['dcid'],
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


def _load_classifications(classifications_dict: List[Dict]) -> List[NLClassifier]:
  classifications = []
  for cdict in classifications_dict:
    attributes = SimpleClassificationAttributes()
    if 'contained_in_place_type' in cdict:
      attributes = ContainedInClassificationAttributes(
          contained_in_place_type=cdict['contained_in_place_type'])
    elif 'ranking_type' in cdict:
      attributes = RankingClassificationAttributes(
          ranking_type=cdict['ranking_type'],
          ranking_trigger_words=[])
    classifications.append(NLClassifier(
      type=cdict['type'],
      attributes=attributes
    ))
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
    charts.append(ChartSpec(chart_type=cdict['chart_type'],
                            places=_load_places(cdict['places']),
                            svs=cdict['svs'],
                            attr=cdict['attr'],
                            utterance=None))
  return charts


# Latest at the front.
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


def load_utterance(uttr_dicts: List[Dict]) -> Utterance:
  if len(uttr_dicts) > CNTXT_LOOKBACK_LIMIT:
    logging.error('Too many past utterances found: ', len(uttr_dicts))

  uttr = None
  prev_uttr = None
  for i in range(len(uttr_dicts)):
    udict = uttr_dicts[len(uttr_dicts) - 1 - i]
    uttr = Utterance(prev_utterance=prev_uttr,
                     query=udict['query'],
                     query_type=udict['query_type'],
                     svs=udict['svs'],
                     places=_load_places(udict['places']),
                     classifications=_load_classifications(udict['classifications']),
                     rankedCharts=_load_charts(udict['ranked_charts']),
                     detection=None,
                     chartCandidates=None,
                     answerPlaces=None)
    prev_uttr = uttr
  return uttr
