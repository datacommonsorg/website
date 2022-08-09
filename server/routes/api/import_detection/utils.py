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

# TODO: define string constants.

# Possible Place types must be encoded below.
# Mapping from DC Type dcid to display name.
PLACE_TYPES: Dict[str, str] = {
    "GeoCoordinates": "Geo Coordinates",
    "State": "State",
    "Country": "Country",
    "Province": "Province",
    "Municipality": "Municipality",
}

# Possible Place properties must be encoded below.
# Mapping from DC Property dcid to display name.
PLACE_PROPERTIES: Dict[str, str] = {
    "name": "Name",
    "longitude": "Longitude",
    "latitude": "Latitude",
    "isoCode": "ISO Code",
    "countryAlpha3Code": "Alpha 3 Code",
    "countryNumericCode": "Numeric Code",
    "fips52AlphaCode": "US State Alpha Code",
    "geoId": "FIPS Code",
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
