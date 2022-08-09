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

from typing import Dict, List, Optional, Tuple
from routes.api.import_detection.detection_types import TypeProperty
from routes.api.import_detection.country_state_detector import CountryStateDetector
from routes.api.import_detection.place_detector_abstract import PlaceDetectorInterface

_MIN_HIGH_CONF_DETECT: float = 0.4

# Tuple of supported Place detectors.
PLACE_DETECTORS: Tuple[PlaceDetectorInterface, ...] = (
    # Country Detector
    CountryStateDetector(type_dcid="Country",
                         property_dcids=[
                             "name", "isoCode", "countryAlpha3Code",
                             "countryNumericCode"
                         ],
                         detection_threshold=_MIN_HIGH_CONF_DETECT,
                         location_mappings_filename="country_mappings.json"),)


def supported_type_properties() -> List[TypeProperty]:
    """Returns the list of supported place TypeProperties."""
    types_props: List[TypeProperty] = []
    for det in PLACE_DETECTORS:
        types_props.extend(det.supported_types_and_properties())

    return types_props


def detect_column_with_places(header: str,
                              col_values: List[str]) -> Optional[TypeProperty]:
    """If the proportion of 'col_values' detected as Place is greater than
    _MIN_HIGH_CONF_DETECT, returns the detected Place TypeProperty.
    @args:
        header: is the column's header.
        col_values: sampled values from the column.
        detectors: the list of detectors to use. If empty, get list from place_detectors().
    @returns:
        The detected Place TypeProperty or None.
    """
    types_found: Dict[str, TypeProperty] = {}
    for det in PLACE_DETECTORS:
        found = det.detect_column(col_values)
        if found is not None:
            types_found.update({found.dc_type.dcid: found})

    # TODO: choose the detection order between different Place types.
    # For now only detects Country.
    if "Country" in types_found:
        return types_found["Country"]

    return None
