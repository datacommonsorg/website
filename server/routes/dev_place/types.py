# Copyright 2024 Google LLC
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
"""
Dev Place API dataclass types
"""

from dataclasses import dataclass
from typing import Dict, List, Optional

CHART_TYPES = {"BAR", "LINE", "MAP", "RANKING"}


@dataclass
class Chart:
  type: str  # Restricted to CHART_TYPES
  title: str
  category: str
  description: str
  statisticalVariableDcids: List[str]
  topicDcids: List[str]
  denominator: Optional[str] = None
  unit: Optional[str] = None
  scaling: Optional[float] = None

  def __post_init__(self):
    # Custom validator for the `type` field
    if self.type not in CHART_TYPES:
      raise ValueError(
          f"Invalid type '{self.type}'. Expected one of {CHART_TYPES}")


@dataclass
class Place:
  dcid: str
  name: str
  types: str


@dataclass
class PlaceChartsApiResponse:
  """
    API Response for /api/place/charts/<place_dcid>
    """
  charts: List[Chart]
  place: Place
  translatedCategoryStrings: Dict[str, str]


@dataclass
class RelatedPlacesApiResponse:
  """
    API Response for /api/related_charts/charts/<place_dcid>
    """
  childPlaceType: str
  childPlaces: List[Place]
  nearbyPlaces: List[Place]
  place: Place
  similarPlaces: List[Place]
