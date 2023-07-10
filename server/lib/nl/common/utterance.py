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

from dataclasses import dataclass
from enum import Enum
from enum import IntEnum
import logging
from typing import Dict, List

from server.lib.nl.common import counters as ctr
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import ContainedInClassificationAttributes
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import Detection
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
from shared.lib.detected_variables import MultiVarCandidates

# How far back does the context go back.
CTX_LOOKBACK_LIMIT = 15


# Forward declaration since Utterance contains a pointer to itself.
class Utterance:
  pass


# Primary charts are about variables/places directly requested by the user.
# Secondary charts are ones about expansions of the primary variables/places.
class ChartOriginType(IntEnum):
  PRIMARY_CHART = 0
  SECONDARY_CHART = 1


# This often has 1:1 correspondence with ClassificationType, but a single
# classification like RANKING might correspond to different query types
# (ranking across vars vs. ranking across places).
class QueryType(IntEnum):
  OTHER = 0
  SIMPLE = 1
  RANKING_ACROSS_PLACES = 2
  RANKING_ACROSS_VARS = 3
  CONTAINED_IN = 4
  CORRELATION_ACROSS_VARS = 5
  COMPARISON_ACROSS_PLACES = 6
  TIME_DELTA_ACROSS_VARS = 7
  TIME_DELTA_ACROSS_PLACES = 8
  EVENT = 9
  OVERVIEW = 10
  SIZE_ACROSS_ENTITIES = 11
  # This is [cities with population over 1M]
  FILTER_WITH_SINGLE_VAR = 12
  # This is [median age in cities with population over 1M]
  FILTER_WITH_DUAL_VARS = 13
  UNKNOWN = 14


# Type of chart.
class ChartType(IntEnum):
  TIMELINE_CHART = 0
  MAP_CHART = 1
  RANKING_CHART = 2
  BAR_CHART = 3
  PLACE_OVERVIEW = 4
  SCATTER_CHART = 5
  EVENT_CHART = 6
  RANKED_TIMELINE_COLLECTION = 7


class FulfillmentResult(str, Enum):
  """Where is a variable or place from?"""
  CURRENT_QUERY = "CURRENT_QUERY"
  PAST_QUERY = "PAST_QUERY"
  DEFAULT = "DEFAULT"
  UNFULFILLED = "UNFULFILLED"
  UNRECOGNIZED = "UNRECOGNIZED"


# Enough of a spec per chart to create the chart config proto.
@dataclass
class ChartSpec:
  chart_type: ChartType
  utterance: Utterance
  places: List[Place]
  svs: List[str]
  event: EventType
  # A list of key-value attributes interpreted per chart_type
  attr: Dict


@dataclass
class PlaceFallback:
  """Has details on place fallback if there is one."""
  # The user provided place
  origPlace: Place
  # The user provided place type.
  origType: ContainedInPlaceType
  # A display string with user-provided place + type
  origStr: str
  # The new fallback place
  newPlace: Place
  # The new fallback type
  newType: ContainedInPlaceType
  # A display string with the new fallback place + type
  newStr: str


# The main Utterance data structure that represents all state
# associated with a user issued query. The past utterances
# form the context saved in the client and shipped to the server.
# TODO: Make this a proper class with methods to convert to dict
#       and load from dict.
@dataclass
class Utterance:
  # Unmodified user-issued query
  query: str
  # Result of classification
  detection: Detection
  # A characterization of the query.
  query_type: QueryType
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
  # Linked list of past utterances
  prev_utterance: Utterance
  # A unique ID to identify sessions
  session_id: str
  # Debug counters that are cleared out before serializing.
  # Some of these might be promoted to the main Debug Info display,
  # but everything else will appear in the raw output.
  counters: ctr.Counters
  # Includes top candidates of multi-SV detection.
  multi_svs: MultiVarCandidates
  # Response from LLM.  Relevant only when LLM is used.
  llm_resp: Dict
  sv_source: FulfillmentResult = FulfillmentResult.CURRENT_QUERY
  place_source: FulfillmentResult = FulfillmentResult.CURRENT_QUERY
  place_fallback: PlaceFallback = None


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
    cdict['attr'] = c.attr
    charts_dict.append(cdict)
  return charts_dict


def _dict_to_chart_spec(charts_dict: List[Dict]) -> List[ChartSpec]:
  charts = []
  for cdict in charts_dict:
    charts.append(
        ChartSpec(chart_type=ChartType(cdict['chart_type']),
                  places=_dict_to_place(cdict['places']),
                  svs=cdict['svs'],
                  event=cdict['event'],
                  attr=cdict['attr'],
                  utterance=None))
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
        place_fallback=_dict_to_place_fallback(udict['placeFallback']))
    prev_uttr = uttr
  return uttr
