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
# Utterance data structure
#

from dataclasses import dataclass
from dataclasses import field
from enum import Enum
from enum import IntEnum
from typing import Dict, List

from server.lib.nl.common import counters as ctr
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import Place
from shared.lib.detected_variables import MultiVarCandidates


# Forward declaration since Utterance contains a pointer to itself.
class Utterance:
  pass


class ChartSpec:
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
  BASIC = 1
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
  TIMELINE_WITH_HIGHLIGHT = 0
  MAP_CHART = 1
  RANKING_WITH_MAP = 2
  BAR_CHART = 3
  PLACE_OVERVIEW = 4
  SCATTER_CHART = 5
  EVENT_CHART = 6
  RANKED_TIMELINE_COLLECTION = 7


class FulfillmentResult(str, Enum):
  """Where is a variable or place from?"""
  # From the current user provided query.
  CURRENT_QUERY = "CURRENT_QUERY"
  # From a past user query in the context.
  # Importantly, no place/variable was recognized in the current query.
  PAST_QUERY = "PAST_QUERY"
  # Subset of the places used are from a past query.
  # (Not used for variables)
  PARTIAL_PAST_QUERY = "PARTIAL_PAST_QUERY"
  # The places come from past answer.
  PAST_ANSWER = "PAST_ANSWER"
  # Place is from a preset default.  Importantly, no place
  # was recognized in the current / past query.
  # (Not used for variables)
  DEFAULT = "DEFAULT"
  # The thing was recognized but we couldn't fulfill it.
  # (Not used with places)
  UNFULFILLED = "UNFULFILLED"
  # The thing was recognized in current / past query.
  UNRECOGNIZED = "UNRECOGNIZED"


# Enough of a spec per chart to create the chart config proto.
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
  # TODO: This shouldn't be attached to the Utterance now
  #       Deprecate it and its users.
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
  # If the answer involves a list of Top N/ Bottom N places, the results
  # are saved here.
  answerPlaces: List[Place]
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
  # This is more details on the *_source if it is from PAST query.
  # This is important for knowing the original place for a query
  # like [poverty across africa] -> [which countries have shown the greatest increase].
  # Because the chart-config of the 2nd query has many places (top countries),
  # but not Africa.
  past_source_context: str = ''
  place_fallback: PlaceFallback = None
  # Past complete context for insight flow.
  insight_ctx: Dict = field(default_factory=dict)