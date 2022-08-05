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

from routes.api.import_detection.detection_types import DCProperty, DCType
from typing import Dict, List, Set

import json
import os
import pathlib
import re

# Possible Place types must be encoded below. Mapping from dcid to DCType.
PLACE_TYPES: Dict[str, DCType] = {
    "GeoCoordinates":
        DCType(dcid="GeoCoordinates", display_name="Geo Coordinates"),
    "State":
        DCType(dcid="State", display_name="State"),
    "Country":
        DCType(dcid="Country", display_name="Country"),
    "Province":
        DCType(dcid="Province", display_name="Province"),
    "Municipality":
        DCType(dcid="Municipality", display_name="Municipality"),
}

# Possible Place properties must be encoded below. Mapping from dcid to DCProperty.
PLACE_PROPERTIES: Dict[str, DCProperty] = {
    "name":
        DCProperty(dcid="name", display_name="Name"),
    "longitude":
        DCProperty(dcid="longitude", display_name="Longitude"),
    "latitude":
        DCProperty(dcid="latitude", display_name="Latitude"),
    "isoCode":
        DCProperty(dcid="isoCode", display_name="ISO Code"),
    "countryAlpha3Code":
        DCProperty(dcid="countryAlpha3Code", display_name="Alpha 3 Code"),
    "countryNumericCode":
        DCProperty(dcid="countryNumericCode", display_name="Numeric Code"),
    "fips52AlphaCode":
        DCProperty(dcid="fips52AlphaCode", display_name="US State Alpha Code"),
    "geoId":
        DCProperty(dcid="geoId", display_name="FIPS Code"),
}


def to_alphanumeric_and_lower(s: str) -> str:
    """Returns only the alphanumeric chars in lower case."""
    return re.sub(r'\W+', '', s.lower())


def read_json_data(filename) -> List[Dict[str, str]]:
    """Reads and returns the json file under the data/ folder."""
    filepath = os.path.join(
        pathlib.Path(__file__).parent.resolve(), "data", filename)
    assert os.path.exists(filepath)
    return json.load(open(filepath, "r"))


def insert_place(unique_places: Set[str], new_place: str) -> None:
    """Updates the 'unique_places' Set by adding 'new_place'.
    Note: place is inserted in lowercase with alphanumeric chars only.
    """
    unique_places.add(to_alphanumeric_and_lower(new_place))
