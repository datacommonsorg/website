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
"""Utility functions."""

from dataclasses import dataclass
import json
import os
import pathlib
import re
from typing import Any, Dict, List

import frozendict


# String constants.
@dataclass
class Consts:
  # DC Type DCIDs.
  T_GEOCOORDS: str = "GeoCoordinates"
  T_COUNTRY: str = "Country"
  T_STATE: str = "State"
  T_PROVINCE: str = "Province"
  T_MUNICIPALITY: str = "Municipality"

  # DC Property DCIDs.
  P_LONG: str = "longitude"
  P_LAT: str = "latitude"
  P_ISO: str = "isoCode"
  P_ALPHA3: str = "countryAlpha3Code"
  P_NUMERIC: str = "countryNumericCode"
  P_FIPS52: str = "fips52AlphaCode"
  P_FIPS: str = "geoId"

  # Mapping helper constants.
  M_DATE: str = "Date"
  M_PLACE: str = "Place"
  M_COLUMN: str = "column"
  M_COLUMNHEADER: str = "columnHeader"


# Possible Place types must be encoded below.
# Mapping from DC Type dcid to display name.
PLACE_TYPES = frozendict.frozendict({
    Consts.T_GEOCOORDS: "Geo Coordinates",
    Consts.T_STATE: "State",
    Consts.T_COUNTRY: "Country",
    Consts.T_PROVINCE: "Province",
    Consts.T_MUNICIPALITY: "Municipality",
})

# Possible Place properties must be encoded below.
# Mapping from DC Property dcid to display name.
PLACE_PROPERTIES = frozendict.frozendict({
    Consts.P_LONG: "Longitude",
    Consts.P_LAT: "Latitude",
    Consts.P_ISO: "ISO Code",
    Consts.P_ALPHA3: "Alpha 3 Code",
    Consts.P_NUMERIC: "Numeric Code",
    Consts.P_FIPS52: "US State Alpha Code",
    Consts.P_FIPS: "FIPS Code",
})


def to_alphanumeric_and_lower(s: str) -> str:
  """Returns only the alphanumeric chars in lower case."""
  return re.sub(r'\W+', '', s.lower())


def read_json_data(filename) -> List[Dict[str, str]]:
  """Reads and returns the json file under the data/ folder."""
  filepath = os.path.join(
      pathlib.Path(__file__).parent.resolve(), "data", filename)
  assert os.path.exists(filepath)
  return json.load(open(filepath, "r"))


def check_list_instance(elements: List, element_type: Any) -> bool:
  """Returns true if elements is of type List and elements are all of type
    element_type."""
  if not isinstance(elements, List):
    return False
  for elem in elements:
    if not isinstance(elem, element_type):
      return False

  return True


def check_dict_instance(d: Dict, key_type: Any, val_type: Any) -> bool:
  """Returns true if map is of type Dict and keys are of type key_type
    and values are of type val_type"""
  if not isinstance(d, Dict):
    return False
  for key, val in d.items():
    if not isinstance(key, key_type) or not isinstance(val, val_type):
      return False

  return True
