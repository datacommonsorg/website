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

# The following classes are used for the NL Detection.
from abc import ABC
from dataclasses import dataclass
from enum import Enum
from enum import IntEnum
from typing import Dict, List


@dataclass
class Place:
  """Place attributes."""
  dcid: str
  name: str
  place_type: str
  country: str = None


@dataclass
class PlaceDetection:
  """Various attributes of place detection."""
  query_original: str
  query_without_place_substr: str
  # `query_places_mentioned` is a list of words in the query
  # identified as possible places.
  query_places_mentioned: List[str]
  places_found: List[Place]
  main_place: Place
  using_default_place: bool = False
  using_from_context: bool = False


@dataclass
class SVDetection:
  """Various attributes of SV detection."""
  query: str
  # The two lists below are assumed to be ordered.
  sv_dcids: List[str]
  sv_scores: List[float]

  # Helpful to have all svs to sentences.
  svs_to_sentences: Dict[str, List[str]]
  # Multi SV detection.
  multi_sv: Dict


class RankingType(IntEnum):
  """RankingType indicates the type of ranking specified."""
  NONE = 0

  # HIGH is for queries like:
  # "most populous cities ..."
  # "top five best places ..."
  # "highest amount of in ..."
  HIGH = 1

  # LOW is for queries like:
  # "least populous cities ..."
  # "worst five best places ..."
  # "least amount of ..."
  LOW = 2

  # BEST is for queries with the word "best"
  # Necessary for processing SVs with negative intent
  # Ex: "Best cities by crime" -> show LOW crime cities
  BEST = 3

  # WORST is for queries with the word "worst"
  # Necessary for processing SVs wth negative intent
  # Ex: "Worst cities by crime" -> show HIGH crime cities
  WORST = 4

  # EXTREME is for queries with the word "extreme"
  # Necessary for SVs where the top could be most positive or most negative
  # Ex: "Temperature extremes" -> show high and very low temperatures
  EXTREME = 5


class BinaryClassificationResultType(IntEnum):
  """Generic result of binary classification: Success/Failure."""
  FAILURE = 0
  SUCCESS = 1


# Note: Inherit from `str` so that if the enum gets logged as json the serializer
# will not complain.
class ContainedInPlaceType(str, Enum):
  """ContainedInPlaceType indicates the type of places."""
  # PLACE is the most generic type.
  PLACE = "Place"
  COUNTRY = "Country"
  STATE = "State"
  COUNTY = "County"
  CITY = "City"
  PROVINCE = "Province"
  DISTRICT = "District"
  DEPARTMENT = "Department"
  DIVISION = "Division"
  MUNICIPALITY = "Municipality"
  PARISH = "Parish"
  CONTINENT = "Continent"

  ZIP = "CensusZipCodeTabulationArea"
  SCHOOL = "School"
  PUBLIC_SCHOOL = "PublicSchool"
  PRIVATE_SCHOOL = "PrivateSchool"
  PRIMARY_SCHOOL = "PrimarySchool"
  ELEMENTARY_SCHOOL = "ElementarySchool"
  MIDDLE_SCHOOL = "MiddleSchool"
  HIGH_SCHOOL = "HighSchool"

  # NOTE: This is a type that State/Province may get remapped to.
  ADMIN_AREA_1 = "AdministrativeArea1"
  # NOTE: This is a type that County/District may get remapped to.
  ADMIN_AREA_2 = "AdministrativeArea2"
  ADMIN_AREA_3 = "AdministrativeArea3"

  # Typically corresponds to state equivalent
  EU_NUTS_2 = "EurostatNUTS2"
  # Typically corresponds to county equivalent
  EU_NUTS_3 = "EurostatNUTS3"

  # Across is a generic containedInPlaceType which determines if the
  # query is using the word "across".
  ACROSS = "Across"


class EventType(IntEnum):
  """Indicates which type of event(s) a query is referring to."""
  COLD = 0  # ColdTemperatureEvent
  CYCLONE = 1  # CycloneEvent
  EARTHQUAKE = 2  # EarthquakeEvent
  DROUGHT = 3  # DroughtEvent
  FIRE = 4  # WildfireEvent or WildlandFireEvent
  FLOOD = 5  # FloodEvent
  HEAT = 6  # HeatTemperatureEvent
  WETBULB = 7  # WetBulbTemperatureEvent


class PeriodType(Enum):
  """PeriodType indicates the type of date range specified."""
  NONE = 0
  EXACT = 1
  UNTIL = 2
  FROM = 3


class TimeDeltaType(IntEnum):
  """Indicates whether query refers to an increase or decrease in SV values."""
  INCREASE = 0
  DECREASE = 1


class SizeType(IntEnum):
  """SizeType indicates the type of size query specified."""
  NONE = 0

  # BIG is for queries like:
  # "how big ..."
  BIG = 1

  # SMALL is for queries like:
  # "how small ..."
  SMALL = 2


class ClassificationAttributes(ABC):
  """Abstract class to hold classification attributes."""
  pass


@dataclass
class SimpleClassificationAttributes(ClassificationAttributes):
  """Simple classification attributes."""
  pass


@dataclass
class RankingClassificationAttributes(ClassificationAttributes):
  """Ranking classification attributes."""
  ranking_type: List[RankingType]

  # List of words which made this a ranking query:
  # e.g. "top", "most", "least", "highest" etc
  # TODO for @juliawu:
  # we should have translator which returns specific
  # types of tirgger words and not just strings.
  ranking_trigger_words: List[str]


@dataclass
class ComparisonClassificationAttributes(ClassificationAttributes):
  """Comparison classification attributes."""
  comparison_trigger_words: List[str]


@dataclass
class ContainedInClassificationAttributes(ClassificationAttributes):
  """ContainedIn classification attributes."""
  contained_in_place_type: ContainedInPlaceType


@dataclass
class ClusteringClassificationAttributes(ClassificationAttributes):
  """Clustering-based Correlation classification attributes."""
  sv_dcid_1: str
  sv_dcid_2: str

  # If is_using_clusters is True, that means sv_1 is coming from
  # cluster_1_svs and sv_2 is coming from cluster_2_svs.
  # Otherwise, the two SVs could have come from the same cluster.
  is_using_clusters: bool

  # Words that may have implied clustering, e.g.
  # "correlation between ...", "related to .."
  correlation_trigger_words: str

  cluster_1_svs: List[str]
  cluster_2_svs: List[str]


@dataclass
class CorrelationClassificationAttributes(ClassificationAttributes):
  """Heuristic-based Correlation classification attributes"""

  # Words that may have implied clustering, e.g.
  # "correlation between ...", "related to .."
  correlation_trigger_words: str


@dataclass
class EventClassificationAttributes(ClassificationAttributes):
  """Event classification attributes"""
  event_types: List[EventType]

  # Words that made this a event query
  event_trigger_words: List[str]


@dataclass
class OverviewClassificationAttributes(ClassificationAttributes):
  """Overview classification attributes"""
  overview_trigger_words: List[str]


@dataclass
class TimeDeltaClassificationAttributes(ClassificationAttributes):
  """Time Delta classification attributes."""
  time_delta_types: List[TimeDeltaType]

  # List of words which made this a time-delta query:
  # e.g. "increase", "decrease", "growth", etc
  time_delta_trigger_words: List[str]


@dataclass
class SizeTypeClassificationAttributes(ClassificationAttributes):
  """Size classification attributes."""
  size_types: List[SizeType]

  # List of words which made this a size-type query:
  # e.g. "big", "small" etc
  size_types_trigger_words: List[str]


class ClassificationType(IntEnum):
  OTHER = 0
  SIMPLE = 1
  RANKING = 2
  TEMPORAL = 3
  CONTAINED_IN = 4
  CORRELATION = 5
  CLUSTERING = 6
  COMPARISON = 7
  TIME_DELTA = 8
  EVENT = 9
  OVERVIEW = 10
  SIZE_TYPE = 11
  UNKNOWN = 12


@dataclass
class NLClassifier:
  """Classifier."""
  type: ClassificationType
  attributes: List[ClassificationAttributes]


@dataclass
class Detection:
  """Detection attributes."""
  original_query: str
  cleaned_query: str
  places_detected: PlaceDetection
  svs_detected: SVDetection
  classifications: List[NLClassifier]
