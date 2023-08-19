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

from dataclasses import asdict
import logging
from typing import Dict, List

from server.lib.nl.common.utterance import ChartType
from server.lib.nl.common.utterance import PlaceFallback
from server.lib.nl.common.utterance import QueryType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import ContainedInClassificationAttributes
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import EventClassificationAttributes
from server.lib.nl.detection.types import EventType
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import RankingClassificationAttributes
from server.lib.nl.detection.types import RankingType
from server.lib.nl.detection.types import SimpleClassificationAttributes
from server.lib.nl.detection.types import SizeType
from server.lib.nl.detection.types import SizeTypeClassificationAttributes
from server.lib.nl.detection.types import TimeDeltaClassificationAttributes
from server.lib.nl.detection.types import TimeDeltaType
from server.lib.nl.fulfillment.types import ChartSpec
from server.lib.nl.fulfillment.types import ChartVars

# How far back does the context go back.
CTX_LOOKBACK_LIMIT = 15

#
# Helper functions for serializing/deserializing Utterance
#


def _place_to_dict(places: List[Place]) -> List[Dict]:
  places_dict = []
  for p in places:
    pdict = {}
    pdict['dcid'] = p.dcid
    pdict['name'] = p.name
    pdict['place_type'] = p.place_type
    pdict['country'] = p.country
    places_dict.append(pdict)
  return places_dict


def _dict_to_place(places_dict: List[Dict]) -> List[Place]:
  places = []
  for pdict in places_dict:
    places.append(
        Place(dcid=pdict['dcid'],
              name=pdict['name'],
              place_type=pdict['place_type'],
              country=pdict['country']))
  return places


def classification_to_dict(classifications: List[NLClassifier]) -> List[Dict]:
  classifications_dict = []
  for c in classifications:
    cdict = {}
    cdict['type'] = c.type

    if isinstance(c.attributes, ContainedInClassificationAttributes):
      cip = c.attributes.contained_in_place_type
      if isinstance(cip, ContainedInPlaceType):
        cdict['contained_in_place_type'] = cip.value
      else:
        # This could also be a simple string (rather than string enum)
        cdict['contained_in_place_type'] = cip
    elif isinstance(c.attributes, EventClassificationAttributes):
      cdict['event_type'] = c.attributes.event_types
    elif isinstance(c.attributes, RankingClassificationAttributes):
      cdict['ranking_type'] = c.attributes.ranking_type
    elif isinstance(c.attributes, TimeDeltaClassificationAttributes):
      cdict['time_delta_type'] = c.attributes.time_delta_types
    elif isinstance(c.attributes, SizeTypeClassificationAttributes):
      cdict['size_type'] = c.attributes.size_types

    classifications_dict.append(cdict)
  return classifications_dict


def dict_to_classification(
    classifications_dict: List[Dict]) -> List[NLClassifier]:
  classifications = []
  for cdict in classifications_dict:
    attributes = SimpleClassificationAttributes()
    if 'contained_in_place_type' in cdict:
      attributes = ContainedInClassificationAttributes(
          contained_in_place_type=ContainedInPlaceType(
              cdict['contained_in_place_type']))
    elif 'event_type' in cdict:
      attributes = EventClassificationAttributes(
          event_types=[EventType(e) for e in cdict['event_type']],
          event_trigger_words=[])
    elif 'ranking_type' in cdict:
      attributes = RankingClassificationAttributes(
          ranking_type=[RankingType(r) for r in cdict['ranking_type']],
          ranking_trigger_words=[])
    elif 'time_delta_type' in cdict:
      attributes = TimeDeltaClassificationAttributes(
          time_delta_types=[TimeDeltaType(t) for t in cdict['time_delta_type']],
          time_delta_trigger_words=[])
    elif 'size_type' in cdict:
      attributes = SizeTypeClassificationAttributes(
          size_types=[SizeType(t) for t in cdict['size_type']],
          size_types_trigger_words=[])
    classifications.append(
        NLClassifier(type=ClassificationType(cdict['type']),
                     attributes=attributes))
  return classifications


def _chart_spec_to_dict(charts: List[ChartSpec]) -> List[Dict]:
  charts_dict = []
  for c in charts:
    cdict = {}
    cdict['chart_type'] = c.chart_type
    cdict['places'] = _place_to_dict(c.places)
    cdict['svs'] = c.svs
    cdict['event'] = c.event
    cdict['place_type'] = c.place_type
    cdict['chart_vars'] = asdict(c.chart_vars)
    cdict['ranking_types'] = c.ranking_types
    charts_dict.append(cdict)
  return charts_dict


def _dict_to_chart_spec(charts_dict: List[Dict]) -> List[ChartSpec]:
  charts = []
  for cdict in charts_dict:
    if cdict.get('chart_vars'):
      cv = ChartVars(**cdict['chart_vars'])
    else:
      cv = ChartVars(svs=[])
    charts.append(
        ChartSpec(
            chart_type=ChartType(cdict['chart_type']),
            places=_dict_to_place(cdict['places']),
            svs=cdict['svs'],
            event=cdict['event'],
            chart_vars=cv,
            place_type=cdict.get('place_type'),
            ranking_types=[RankingType(c) for c in cdict['ranking_types']],
            ranking_count=0,
            chart_origin=None))
  return charts


def _place_fallback_to_dict(pfb: PlaceFallback) -> Dict:
  if not pfb:
    return {}
  pfb_dict = {}
  if pfb.origType:
    pfb_dict['origType'] = pfb.origType.value
  if pfb.newType:
    pfb_dict['newType'] = pfb.newType.value
  pfb_dict['origPlace'] = _place_to_dict([pfb.origPlace])[0]
  pfb_dict['newPlace'] = _place_to_dict([pfb.newPlace])[0]
  pfb_dict['origStr'] = pfb.origStr
  pfb_dict['newStr'] = pfb.newStr
  return pfb_dict


def _dict_to_place_fallback(pfb_dict: Dict) -> PlaceFallback:
  if 'origPlace' not in pfb_dict or 'newPlace' not in pfb_dict:
    return None

  ot = None
  if 'origType' in pfb_dict:
    ot = ContainedInPlaceType(pfb_dict['origType'])

  nt = None
  if 'newType' in pfb_dict:
    nt = ContainedInPlaceType(pfb_dict['newType'])

  op = _dict_to_place([pfb_dict['origPlace']])[0]
  np = _dict_to_place([pfb_dict['newPlace']])[0]

  return PlaceFallback(origPlace=op,
                       origType=ot,
                       origStr=pfb_dict['origStr'],
                       newPlace=np,
                       newType=nt,
                       newStr=pfb_dict['newStr'])


# Given the latest Utterance, saves the full list of utterances into a
# dict.  The latest utterance is in the front.
def save_utterance(uttr: Utterance) -> List[Dict]:
  uttr_dicts = []
  u = uttr
  cnt = 0
  while u and cnt < CTX_LOOKBACK_LIMIT:
    udict = {}
    udict['query'] = u.query
    udict['query_type'] = u.query_type
    udict['svs'] = u.svs
    udict['places'] = _place_to_dict(u.places)
    udict['classifications'] = classification_to_dict(u.classifications)
    udict['ranked_charts'] = _chart_spec_to_dict(u.rankedCharts)
    udict['session_id'] = u.session_id
    udict['llm_resp'] = u.llm_resp
    udict['placeFallback'] = _place_fallback_to_dict(u.place_fallback)
    udict['insightCtx'] = u.insight_ctx
    uttr_dicts.append(udict)
    u = u.prev_utterance
    cnt += 1

  return uttr_dicts


# Given a list of dicts previously saved by `save_utterance()`, loads
# them into Utterance structures and returns the latest one.
def load_utterance(uttr_dicts: List[Dict]) -> Utterance:
  if len(uttr_dicts) > CTX_LOOKBACK_LIMIT:
    logging.error('Too many past utterances found: %d', len(uttr_dicts))

  uttr = None
  prev_uttr = None
  for i in range(len(uttr_dicts)):
    udict = uttr_dicts[len(uttr_dicts) - 1 - i]
    uttr = Utterance(
        prev_utterance=prev_uttr,
        query=udict['query'],
        query_type=QueryType(udict['query_type']),
        svs=udict['svs'],
        places=_dict_to_place(udict['places']),
        classifications=dict_to_classification(udict['classifications']),
        rankedCharts=_dict_to_chart_spec(udict['ranked_charts']),
        detection=None,
        chartCandidates=None,
        answerPlaces=None,
        counters=None,
        session_id=udict['session_id'],
        multi_svs=None,
        llm_resp=udict.get('llm_resp', {}),
        place_fallback=_dict_to_place_fallback(udict['placeFallback']),
        insight_ctx=udict.get('insightCtx', {}))
    prev_uttr = uttr
  return uttr
