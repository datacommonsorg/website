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
Place API dataclass types
"""

from dataclasses import dataclass
from typing import Dict, List, Optional

CHART_TYPES = {"BAR", "LINE", "MAP", "RANKING"}

@dataclass
class RankingTileSpec:
  showHighest: bool = False
  showLowest: bool = False
  highestTitle: Optional[str] = None
  lowestTitle: Optional[str] = None
  rankingCount: Optional[int] = None
  showMultiColumn: bool = False
  showHighestLowest: Optional[bool] = None

@dataclass
class BarTileSpec:
  xLabelLinkRoot: Optional[str]
  barHeight: Optional[int]
  colors: Optional[List[str]]
  horizontal: Optional[bool]
  maxPlaces: Optional[int]
  maxVariables: Optional[int]
  sort: Optional[str]
  stacked: Optional[bool]
  useLollipop: Optional[bool]
  yAxisMargin: Optional[int]
  variableNameRegex: Optional[str]
  defaultVariableName: Optional[str]


@dataclass
class Chart:
  type: str  # Restricted to CHART_TYPES
  title: str
  category: str
  description: str
  statisticalVariableDcids: List[str]
  topicDcids: List[str]
  denominator: Optional[List[str]] = None
  unit: Optional[str] = None
  scaling: Optional[float] = None
  childPlaceType: Optional[str] = None
  rankingTileSpec: Optional[RankingTileSpec] = None
  barTileSpec: Optional[BarTileSpec] = None
  showComparisonPlaces: Optional[str] = None

  def __post_init__(self):
    # Custom validator for the `type` field
    if self.type not in CHART_TYPES:
      raise ValueError(
          f"Invalid type '{self.type}'. Expected one of {CHART_TYPES}")


@dataclass
class Place:
  dcid: str
  name: str
  types: List[str]
  dissolved: bool = False


@dataclass
class PlaceChartsApiResponse:
  """
  API Response for /api/dev-place/charts/<place_dcid>
  """
  charts: List[Chart]
  place: Place
  translatedCategoryStrings: Dict[str, str]


@dataclass
class RelatedPlacesApiResponse:
  """
  API Response for /api/dev-place/related-places/<place_dcid>
  """
  childPlaceType: str
  childPlaces: List[Place]
  nearbyPlaces: List[Place]
  place: Place
  similarPlaces: List[Place]
  parentPlaces: List[Place] = None
