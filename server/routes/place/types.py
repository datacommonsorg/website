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
from typing import List, Optional

CHART_TYPES = {"BAR", "LINE", "MAP", "RANKING", "HIGHLIGHT"}


@dataclass
class Chart:
  type: str  # Restricted to CHART_TYPES
  maxPlaces: int

  def __post_init__(self):
    # Custom validator for the `type` field
    if self.type not in CHART_TYPES:
      raise ValueError(
          f"Invalid type '{self.type}'. Expected one of {CHART_TYPES}")


@dataclass
class BlockConfig:
  charts: List[Chart]
  category: str
  title: str
  topicDcids: List[str]
  description: str
  denominator: Optional[List[str]] = None
  statisticalVariableDcids: Optional[List[str]] = None
  unit: Optional[str] = None
  scaling: Optional[float] = None
  childPlaceType: Optional[str] = None
  placeScope: Optional[str] = None


@dataclass
class Place:
  dcid: str
  name: str
  types: List[str]
  dissolved: bool = False

  def __eq__(self, other):
    if not isinstance(other, Place):
      return False
    return (self.dcid == other.dcid and self.name == other.name and
            self.types == other.types and self.dissolved == other.dissolved)


@dataclass
class Category:
  name: str
  translatedName: str
  hasMoreCharts: bool = False


@dataclass
class PlaceChartsApiResponse:
  """
  API Response for /api/place/charts/<place_dcid>
  """
  blocks: List[BlockConfig]
  place: Place
  categories: List[Category]


@dataclass
class RelatedPlacesApiResponse:
  """
  API Response for /api/place/related-places/<place_dcid>
  """
  childPlaceType: str
  childPlaces: List[Place]
  nearbyPlaces: List[Place]
  place: Place
  similarPlaces: List[Place]
  parentPlaces: List[Place] = None
  peersWithinParent: List[str] = None


@dataclass
class ServerChartMetadata:
  """Chart metadata for the server configuration for charts"""
  type: str
  max_places: Optional[int] = None

  def __eq__(self, other):
    if not isinstance(other, ServerChartMetadata):
      return False
    return (self.type == other.type and self.max_places == other.max_places)


@dataclass
class ServerBlockMetadata:
  """Block metadata for the server configuration for blocks"""
  place_scope: str
  charts: List[ServerChartMetadata]
  is_overview: bool = False
  non_dividable: bool = False  # After existence checks
  title: Optional[str] = None

  def __eq__(self, other):
    if not isinstance(other, ServerBlockMetadata):
      return False
    return (self.place_scope == other.place_scope and
            self.is_overview == other.is_overview and
            self.is_overview == other.is_overview and
            self.non_dividable == other.non_dividable and
            self.title == other.title and self.charts == other.charts)


@dataclass
class ServerChartConfiguration:
  """Configuration of hardcoded charts in server/config/chart_config"""
  # Note that this is only for the revamped place page chart format.
  category: str
  title_id: str
  title: str
  description: str
  variables: List[str]
  denominator: Optional[List[str]]
  blocks: List[ServerBlockMetadata]
  unit: Optional[str] = None
  scaling: Optional[int] = None
  non_dividable: bool = False  # Read in from configs
  scale: bool = False

  def __eq__(self, other):
    if not isinstance(other, ServerChartConfiguration):
      return False
    return (self.category == other.category and
            self.title_id == other.title_id and self.title == other.title and
            self.description == other.description and
            self.variables == other.variables and
            self.denominator == other.denominator and
            self.blocks == other.blocks and self.unit == other.unit and
            self.scaling == other.scaling and
            self.non_dividable == other.non_dividable and
            self.scale == other.scale)


@dataclass
class OverviewTableDataRow:
  """
  A single row of overview table data for a place.
  """
  date: str
  name: str
  provenanceUrl: str
  unit: Optional[str]
  value: float
  variableDcid: str


@dataclass
class PlaceOverviewTableApiResponse:
  """
  API Response for /api/place/overview-table/<place_dcid>
  """
  data: List[OverviewTableDataRow]
