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
from typing import List


@dataclass
class Place:
  """Place attributes."""
  dcid: str
  name: str
  place_type: str


@dataclass
class PlaceDetection:
  """Various attributes of place detection."""
  query_original: str
  query_without_place_substr: str
  places_found: List[str]
  main_place: Place
  using_default_place: bool


@dataclass
class SVDetection:
  """Various attributes of SV detection."""
  query: str
  # The two lists below are assumed to be ordered.
  sv_dcids: List[str]
  sv_scores: List[float]


class RankingType(Enum):
  """RankingType indicates the type of rankning specified."""
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


class ContainedInPlaceType(Enum):
  """ContainedInPlaceType indicates the type of places."""
  # PLACE is the most generic type.
  PLACE = 0
  COUNTRY = 1
  STATE = 2
  PROVINCE = 3
  COUNTY = 4
  CITY = 5
  DISTRICT = 6
  TOWN = 7
  ZIP = 8


class PeriodType(Enum):
  """PeriodType indicates the type of date range specified."""
  NONE = 0
  EXACT = 1
  UNTIL = 2
  FROM = 3


class ClassificationAttributes(ABC):
  """Abctract class to hold classification attributes."""
  pass


@dataclass
class SimpleClassificationAttributes(ClassificationAttributes):
  """Simple classification attributes."""
  pass


@dataclass
class RankingClassificationAttributes(ClassificationAttributes):
  """Ranking classification attributes."""
  ranking_type: RankingType

  # List of words which made this a ranking query:
  # e.g. "top", "most", "least", "highest" etc
  # TODO for @juliawu:
  # we should have translator which returns specific
  # types of tirgger words and not just strings.
  ranking_trigger_words: List[str]


@dataclass
class TemporalClassificationAttributes(ClassificationAttributes):
  """Temporal classification attributes."""
  date_str: str
  date_type: PeriodType


@dataclass
class ContainedInClassificationAttributes(ClassificationAttributes):
  """ContainedIn classification attributes."""
  contained_in_place_type: ContainedInPlaceType


@dataclass
class CorrelationClassificationAttributes(ClassificationAttributes):
  """Correlation classification attributes."""
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


class ClassificationType(Enum):
  OTHER = 0
  SIMPLE = 1
  RANKING = 2
  TEMPORAL = 3
  CONTAINED_IN = 4
  CORRELATION = 5


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
