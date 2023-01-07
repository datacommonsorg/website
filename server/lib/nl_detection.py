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
from typing import Dict, List


@dataclass
class Place:
  """Place attributes."""
  dcid: str
  name: str
  place_type: str


@dataclass
class SV:
  """Statistical Variable attributes."""
  dcid: str
  name: str


@dataclass
class PlaceDetection:
  """Various attributes of place detection."""
  query_original: str
  query_place_substr: str
  query_without_place_substr: str
  places_found: List[str]
  main_place: Place


@dataclass
class SVDetection:
  """Various attributes of SV detection."""
  query: str
  sv2scores: Dict[str, float]


class ClassificationAttributes(ABC):
  """Abctract class to hold classification attributes."""
  pass


@dataclass
class SimpleClassificationAttributes(ClassificationAttributes):
  """Simple classification attributes."""
  place_detected: Place
  sv_detected: SV


@dataclass
class Classifier:
  """Classifier."""
  type: str
  attributes: List[ClassificationAttributes]


@dataclass
class Detection:
  """Detection attributes."""
  original_query: str
  places_detected: PlaceDetection
  svs_detected: SVDetection
  classifications: List[Classifier]
