# Copyright 2022 Google LLC
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
"""Classes (Enum, dataclass) used in the the various import_detection modules."""

from dataclasses import dataclass
from enum import Enum
from typing import List, Optional

from server.routes.import_detection.utils import Consts as c


# Helper Enums and Data Classes for Detection.
class MappingType(Enum):
  """Supported types of column structure."""
  COLUMN = c.M_COLUMN
  COLUMN_HEADER = c.M_COLUMNHEADER


class MappedThing(Enum):
  """Supported type of Thing being mapped."""
  DATE = c.M_DATE
  PLACE = c.M_PLACE


@dataclass
class Column:
  """Data Type for a Column."""
  # The Id of the column.
  id: str

  # Column header name.
  header: str

  # Column index (starting with 0).
  column_idx: int


@dataclass
class Entity:
  """A DC Entity."""
  dcid: str
  display_name: str


class DCType(Entity):
  """A Data Commons entity type, e.g. Country (which is a type of Place)."""


class DCProperty(Entity):
  """A Data Commons property, e.g. longitude."""


@dataclass
class TypeProperty:
  """A combination of the DC Type and associated Property."""
  dc_type: DCType
  dc_property: DCProperty

  def __hash__(self) -> int:
    return hash(repr(self))


@dataclass
class MappingVal:
  # The value of the MappingType enum (column or columnHeader)
  type: str

  # Column that holds the mapping values. Should be set if type is MappingType.COLUMN
  column: Optional[Column] = None

  # The place property (in KG) associated with that
  # column or column header. Should be set if MappedThing is PLACE.
  place_property: Optional[DCProperty] = None

  # The place type (in KG) associated with that
  # column or column header. Should be set if MappedThing is PLACE.
  place_type: Optional[DCType] = None

  # List of column headers that act as the mapping values. Should be set if
  # type is MappingType.COLUMN_HEADERS
  headers: Optional[List[Column]] = None
