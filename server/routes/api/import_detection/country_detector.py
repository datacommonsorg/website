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
"""Country Detector."""

from routes.api.import_detection.detection_types import TypeProperty
from routes.api.import_detection.place_detector_abstract import PlaceDetectorInterface
import routes.api.import_detection.utils as utils
from typing import Dict, List, Optional, Set

_COUNTRY_MAPPINGS_FILENAME: str = "country_mappings.json"


class CountryDetector(PlaceDetectorInterface):

    def __init__(self, type_dcid: str, property_dcids: List[str],
                 detection_threshold: float) -> None:
        super().__init__(type_dcid, property_dcids, detection_threshold)

        # Some more country detection specific instance attributes.
        self._countries: Dict[str, Set[str]] = {}
        for prop_dcid in self._supported_property_dcids:
            self._countries[prop_dcid] = set()

        # Call the pre_process method to set any more instance attributes.
        self._pre_process()

    def _pre_process(self) -> None:
        """Processes the country_mappings json file and sets the corresponding
        instance attributes."""
        country_list: List[Dict[str, str]] = utils.read_json_data(
            _COUNTRY_MAPPINGS_FILENAME)
        assert country_list, "country_mappings.json produced no countries."

        for country in country_list:
            for prop, unique_places in self._countries.items():
                if country[prop]:
                    utils.insert_place(unique_places, country[prop])

    def detect_column(self, values: List[str]) -> Optional[TypeProperty]:
        total: int = 0

        # Initialize couners.
        counters: Dict[str, int] = {}
        for prop_dcid in self._supported_property_dcids:
            counters[prop_dcid] = 0

        # Update counters.
        for val in values:
            if val and isinstance(val, str):
                val = utils.to_alphanumeric_and_lower(val)
                total += 1

                for prop_dcid in self._supported_property_dcids:
                    if val in self._countries[prop_dcid]:
                        counters[prop_dcid] += 1

        for prop_dcid in self._supported_property_dcids:
            if counters[prop_dcid] / total > self._column_detection_threshold:
                # The parent class constructor checked for the existence of
                # self.supported_type_dcid in utils.PLACE_TYPES and that
                # prop_dcid exists in utils.PLACE_PROPERTIES.
                return TypeProperty(
                    utils.PLACE_TYPES[self._supported_type_dcid],
                    utils.PLACE_PROPERTIES[prop_dcid])

        return None
