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
"""Place Detector Abstract Class."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from routes.api.import_detection.detection_types import DCType, DCProperty, TypeProperty
import routes.api.import_detection.utils as utils
from typing import List, Optional, Set


@dataclass
class TPName:
    """Helper class to manage Type (dcid) and Property (dcid) combination."""
    type_dcid: str
    prop_dcid: str


class PlaceDetectorInterface(ABC):
    """PlaceDetectorInterface is the Place detector abstract class.
    The base class has the following (instance) attributes:
        supported_type_dcid:
            the dcid of the place type being detected.
        supported_property_dcids:
            the dcids of the place properties being detected.
        column_detection_threshold:
            the threshold (between 0 and 1) which denotes
            the min proportion of column values that must be detected for the
            column to be detected as a likely place.
    """

    def __init__(self, type_dcid: str, property_dcids: List[str],
                 detection_threshold: float) -> None:
        """Constructor sets the instance attributes with some validations."""
        assert type_dcid in utils.PLACE_TYPES
        self._supported_type_dcid: str = type_dcid

        for prop_dcid in property_dcids:
            assert prop_dcid in utils.PLACE_PROPERTIES
        self._supported_property_dcids: List[str] = property_dcids

        assert detection_threshold > 0.0 and detection_threshold <= 1.0
        self._column_detection_threshold: float = detection_threshold

    @abstractmethod
    def _pre_process(self) -> None:
        """Process any data and set instance attributes."""

    @abstractmethod
    def detect_column(self, values: List[str]) -> Optional[TypeProperty]:
        """If values are detected as Places, then return the TypeProperty
        detected. Otherwise, return None.
        @args:
            values: the column values.
        
        @returns:
            The TypeProperty detected or None.
        """

    def supported_types_and_properties(self) -> Set[TypeProperty]:
        """Return the supported Type, Property combinations."""
        dc_type: DCType = utils.PLACE_TYPES[self._supported_type_dcid]

        supported_tp: Set[TypeProperty] = set()
        for prop_dcid in self._supported_property_dcids:
            dc_prop: DCProperty = utils.PLACE_PROPERTIES[prop_dcid]
            supported_tp.add(TypeProperty(dc_type=dc_type, dc_property=dc_prop))
        return supported_tp
