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
"""Country or State Detector."""

from typing import Dict, List, Optional, Set

from server.routes.import_detection.detection_types import DCProperty
from server.routes.import_detection.detection_types import DCType
from server.routes.import_detection.detection_types import TypeProperty
from server.routes.import_detection.place_detector_abstract import \
    PlaceDetectorInterface
import server.routes.import_detection.utils as utils


class CountryStateDetector(PlaceDetectorInterface):
  """Detects Country or State properties.

  For Country, specify the constructor args corresponding to
  country detection. Similarly, for States, the constructor args
  must correspond to state detection.
  """

  def __init__(self, type_dcid: str, property_dcids: List[str],
               detection_threshold: float,
               location_mappings_filename: Optional[str]) -> None:
    super().__init__(type_dcid, property_dcids, detection_threshold)

    # Some more place (country/state) detection specific instance attributes.
    # self._places is a map of property dcid to the set of place values
    # corresponding to the property. For example, for the property dcid
    # 'name', possible country values could be {"United States", "Canada"}.
    self._places: Dict[str, Set[str]] = {}
    for prop_dcid in self._supported_property_dcids:
      self._places[prop_dcid] = set()

    if location_mappings_filename is not None:
      self.location_mappings_filename = location_mappings_filename

    # Call the pre_process method to set any more instance attributes.
    self._pre_process()

  def _pre_process(self) -> None:
    """Processes self.location_mappings_filename and sets the corresponding
    instance attributes."""
    places_list: List[Dict[str, str]] = utils.read_json_data(
        self.location_mappings_filename)
    assert places_list, "location_mappings_filename (%s) produced no locations." % self.location_mappings_filename

    for place in places_list:
      for prop, unique_places in self._places.items():
        pl_prop: str = place[prop]
        if pl_prop:
          unique_places.add(utils.to_alphanumeric_and_lower(pl_prop))

  def detect_column(self, values: List[str]) -> Optional[TypeProperty]:
    total: int = 0

    # Initialize counters.
    counters: Dict[str, int] = {}
    for prop_dcid in self._supported_property_dcids:
      counters[prop_dcid] = 0

    # Update counters.
    for val in values:
      if val and isinstance(val, str):
        val = utils.to_alphanumeric_and_lower(val)
        total += 1

        for prop_dcid in self._supported_property_dcids:
          if val in self._places[prop_dcid]:
            counters[prop_dcid] += 1
    if not total:
      return None

    dc_type: DCType = DCType(self._supported_type_dcid,
                             utils.PLACE_TYPES[self._supported_type_dcid])

    # Return the property which has the highest detection score.
    max_score: float = 0
    prop_max: str = ""
    for prop_dcid in self._supported_property_dcids:
      score: float = counters[prop_dcid] / total
      if score > self._column_detection_threshold and score >= max_score:
        # The parent class constructor checked for the existence of
        # self.supported_type_dcid in utils.PLACE_TYPES and that
        # prop_dcid exists in utils.PLACE_PROPERTIES.
        max_score = score
        prop_max = prop_dcid
    if max_score > 0:
      dc_prop: DCProperty = DCProperty(prop_max,
                                       utils.PLACE_PROPERTIES[prop_max])
      return TypeProperty(dc_type, dc_prop)

    return None
