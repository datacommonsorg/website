# The following classes are used for the NL Detection.
from abc import ABC
from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass
class Place:
  """Place attributes."""
  dcid: str
  name: str


@dataclass
class SV:
  """Statistical Variable attributes."""
  dcid: str
  name: str
  place_type: str


@dataclass
class PlaceDetection:
  """Various attributes of place detection."""
  query: str
  query_without_place: str
  places_found: List[str]
  main_place: Place


@dataclass
class SVDetection:
  """Various attributes of SV detection."""
  query: str
  sv2scores: Dict[str, float]

  highlight_svs: List[str]
  relevant_svs: List[str]


class ClassificationAttributes(ABC):
  """Abctract class to hold classification attributes."""
  pass


@dataclass
class SimpleClassificationAttributes(ClassificationAttributes):
  """Simple classification attributes."""
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
