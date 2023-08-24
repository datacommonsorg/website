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
from dataclasses import field
from enum import Enum
from enum import IntEnum
from typing import Dict, List, Optional

from shared.lib import detected_variables as dvars


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
  peer_places: List[Place] = field(default_factory=list)
  parent_places: List[Place] = field(default_factory=list)
  # This is only of the `child_type` requested.
  child_places: List[Place] = field(default_factory=list)


@dataclass
class SVDetection:
  """Various attributes of SV detection."""
  query: str
  # Single SV detection.
  single_sv: dvars.VarCandidates
  # Multi SV detection.
  multi_sv: dvars.MultiVarCandidates


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
  CENSUS_TRACT = "CensusTract"
  SCHOOL = "School"
  PUBLIC_SCHOOL = "PublicSchool"
  PRIVATE_SCHOOL = "PrivateSchool"
  PRIMARY_SCHOOL = "PrimarySchool"
  ELEMENTARY_SCHOOL = "ElementarySchool"
  MIDDLE_SCHOOL = "MiddleSchool"
  HIGH_SCHOOL = "HighSchool"
  COUNTY_DIVISION = "CensusCountyDivision"

  ADMIN_AREA = "AdministrativeArea"

  # NOTE: This is a type that State/Province may get remapped to.
  ADMIN_AREA_1 = "AdministrativeArea1"
  # NOTE: This is a type that County/District may get remapped to.
  ADMIN_AREA_2 = "AdministrativeArea2"
  ADMIN_AREA_3 = "AdministrativeArea3"

  # Typically corresponds to state equivalent
  EU_NUTS_1 = "EurostatNUTS1"
  EU_NUTS_2 = "EurostatNUTS2"
  # Typically corresponds to county equivalent
  EU_NUTS_3 = "EurostatNUTS3"

  # Indicates that the fulfiller should use the contained-in-place-type
  # depending on the place.
  DEFAULT_TYPE = "DefaultType"


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
  CHANGE = 2


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
class GeneralClassificationAttributes(ClassificationAttributes):
  """Simple class for classification based on certain words attributes"""
  trigger_words: List[str]


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


class QCmpType(str, Enum):
  """Enum to represent comparison types"""
  EQ = "EQ"
  GE = "GE"
  GT = "GT"
  LE = "LE"
  LT = "LT"


@dataclass
class Quantity:
  """Represents a numeric quantity that in a filter query."""
  cmp: QCmpType
  # The converted value
  val: float

  def __str__(self):
    return f'({self.cmp.value} {self.val})'


@dataclass
class QuantityRange:
  """Represents a range of two numeric quantities."""
  lower: Quantity
  upper: Quantity

  def __str__(self):
    return f'{self.lower} {self.upper}'


@dataclass
class QuantityClassificationAttributes(ClassificationAttributes):
  """Quantity classification attributes."""
  # One and only one of the below is set.
  qval: Quantity
  qrange: QuantityRange
  # Smallest index in the query of the quantity sub-string.
  idx: int

  def __str__(self):
    if self.qval:
      return f'({self.qval} idx:{self.idx})'
    return f'({self.qrange} idx:{self.idx})'


@dataclass
class Date:
  """Represents a range of two numeric quantities."""
  prep: str
  year: int
  month: Optional[int] = 0
  year_span: Optional[int] = 0

  def __str__(self):
    return f'{self.year} - {self.month} | {self.year_span}'


@dataclass
class DateClassificationAttributes(ClassificationAttributes):
  dates: List[Date]


class ClassificationType(IntEnum):
  OTHER = 0
  SIMPLE = 1
  RANKING = 2
  QUANTITY = 3
  CONTAINED_IN = 4
  CORRELATION = 5
  COMPARISON = 7
  TIME_DELTA = 8
  EVENT = 9
  OVERVIEW = 10
  SIZE_TYPE = 11
  DATE = 12
  ANSWER_PLACES_REFERENCE = 13
  PER_CAPITA = 14
  UNKNOWN = 15


@dataclass
class NLClassifier:
  """Classifier."""
  type: ClassificationType
  attributes: List[ClassificationAttributes]


class ActualDetectorType(str, Enum):
  """Enum to represent detector types"""
  Heuristic = "Heuristic Based"
  LLM = "LLM Based"
  # No fallback
  HybridHeuristic = "Hybrid - Heuristic Based"
  # Fallback to LLM fully
  HybridLLMFull = "Hybrid - LLM Fallback (Full)"
  # Fallback to LLM for place detection only
  HybridLLMPlace = "Hybrid - LLM Fallback (Place)"
  # Fallback to LLM for variable detection only
  HybridLLMVar = "Hybrid - LLM Fallback (Variable)"
  # The case of no detector involved.
  NOP = "Detector unnecessary"


class RequestedDetectorType(str, Enum):
  """Enum to represent detector types"""
  Heuristic = "heuristic"
  LLM = "llm"
  Hybrid = "hybrid"


class PlaceDetectorType(str, Enum):
  # Represents the open-source NER implementation
  NER = "ner"
  # Represents the home-grown RecognizePlaces Recon API
  DC = "dc"
  # The case of no detector involved
  NOP = "nop"


@dataclass
class Detection:
  """Detection attributes."""
  original_query: str
  cleaned_query: str
  places_detected: PlaceDetection
  svs_detected: SVDetection
  classifications: List[NLClassifier]
  llm_resp: Dict = field(default_factory=dict)
  detector: ActualDetectorType = ActualDetectorType.Heuristic
  place_detector: PlaceDetectorType = PlaceDetectorType.NER