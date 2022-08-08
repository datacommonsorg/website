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
"""Place Detection."""

from typing import Dict, List, Optional
from routes.api.import_detection.detection_types import TypeProperty
from routes.api.import_detection.country_state_detector import CountryStateDetector
from routes.api.import_detection.place_detector_abstract import PlaceDetectorInterface

import routes.api.import_detection.utils as utils

_MIN_HIGH_CONF_DETECT: float = 0.4


def place_detectors() -> List[PlaceDetectorInterface]:
    """Returns the list of supported Place detectors."""
    # Country Detector
    country_detector: PlaceDetectorInterface = CountryStateDetector(
        type_dcid="Country",
        property_dcids=[
            "name", "isoCode", "countryAlpha3Code", "countryNumericCode"
        ],
        detection_threshold=_MIN_HIGH_CONF_DETECT,
        location_mappings_filename="country_mappings.json")

    state_detector: PlaceDetectorInterface = CountryStateDetector(
        type_dcid="State",
        property_dcids=["name", "isoCode", "fips52AlphaCode", "geoId"],
        detection_threshold=_MIN_HIGH_CONF_DETECT,
        location_mappings_filename="state_mappings.json")

    return [country_detector, state_detector]


def supported_type_properties(
    detectors: Optional[List[PlaceDetectorInterface]] = None
) -> List[TypeProperty]:
    """Returns the list of supported place TypeProperties."""
    if detectors is None:
        detectors = place_detectors()

    types_props: List[TypeProperty] = []
    for det in detectors:
        types_props.extend(det.supported_types_and_properties())

    return types_props


def detect_column_with_places(
    header: str,
    col_values: List[str],
    detectors: Optional[List[PlaceDetectorInterface]] = None
) -> Optional[TypeProperty]:
    """If the proportion of 'col_values' detected as Place is greater than
    _MIN_HIGH_CONF_DETECT, returns the detected Place TypeProperty.
    @args:
        header: is the column's header.
        col_values: sampled values from the column.
        detectors: the list of detectors to use. If empty, get list from place_detectors().
    @returns:
        The detected Place TypeProperty or None.
    """
    if detectors is None:
        detectors = place_detectors()

    types_found: Dict[str, TypeProperty] = {}
    for det in detectors:
        found = det.detect_column(col_values)
        if found is not None:
            types_found.update({found.dc_type.dcid: found})

    # If country was detected and the header has a country in the name, return
    # country. If not, we have to do more work to disambiguate country vs state.
    if "Country" in types_found and "country" in utils.to_alphanumeric_and_lower(
            header):
        return types_found["Country"]

    # If state was detected and the header has a state in the name, return
    # state.
    if "State" in types_found and "state" in utils.to_alphanumeric_and_lower(
            header):
        return types_found["State"]

    # Finally, if none of the headers match, give preference to country
    # detection over state detection.
    if "Country" in types_found:
        return types_found["Country"]

    if "State" in types_found:
        return types_found["State"]

    # At this point, there was no detection possible. Return None.
    return None
