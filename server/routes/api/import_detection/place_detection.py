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

from server.routes.api.import_detection.country_state_detector import \
    CountryStateDetector
from server.routes.api.import_detection.detection_types import TypeProperty
from server.routes.api.import_detection.place_detector_abstract import \
    PlaceDetectorInterface
from server.routes.api.import_detection.utils import Consts as c
import server.routes.api.import_detection.utils as utils

_MIN_HIGH_CONF_DETECT: float = 0.4

# Place detection property preference orders.
COUNTRY_PROP_PREF_ORDER: List[str] = [
    c.P_DCID, c.P_ISO, c.P_ALPHA3, c.P_NUMERIC
]

STATE_PROP_PREF_ORDER: List[str] = [c.P_DCID, c.P_ISO, c.P_FIPS52, c.P_FIPS]

# Tuple of supported Place detectors.
PLACE_DETECTORS: Tuple[PlaceDetectorInterface, ...] = (
    # Country Detector
    CountryStateDetector(type_dcid=c.T_COUNTRY,
                         property_dcids=COUNTRY_PROP_PREF_ORDER,
                         detection_threshold=_MIN_HIGH_CONF_DETECT,
                         location_mappings_filename="country_mappings.json"),
    # State detector
    CountryStateDetector(type_dcid=c.T_STATE,
                         property_dcids=STATE_PROP_PREF_ORDER,
                         detection_threshold=_MIN_HIGH_CONF_DETECT,
                         location_mappings_filename="state_mappings.json"),
)


def preferred_property(detected_places: Dict[int, TypeProperty],
                       property_order: List[str]) -> Optional[int]:
  """preferred_property is a helper function which returns the column index (key) of the
  detected place in detected_places based on a ranked order of preferred property types.
  For example, given two column indices (keys) both of which correspond to TypeProperty
  with type dcid = "Country", if one of them has property dcid as ISO codes and the
  other has country numbers, we will prefer the one with ISO codes.
  @args:
      detected_places: mapping from column indices to the detected TypeProperty.
      property_order: the ranked order of preference for property dcids.
  @returns:
      The column index of the most preferred TypeProperty or None if there is no match.
  """
  for prop_dcid in property_order:
    for col_idx, type_prop in detected_places.items():
      if prop_dcid == type_prop.dc_property.dcid:
        return col_idx
  return None


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

  # If country was detected and the header has a country in the name, return
  # country. If not, we have to do more work to disambiguate country vs state.
  if c.T_COUNTRY in types_found and c.T_COUNTRY.lower(
  ) in utils.to_alphanumeric_and_lower(header):
    return types_found[c.T_COUNTRY]

  # If state was detected and the header has a state in the name, return
  # state.
  if c.T_STATE in types_found and c.T_STATE.lower(
  ) in utils.to_alphanumeric_and_lower(header):
    return types_found[c.T_STATE]

  # Finally, if none of the headers match, give preference to country
  # detection over state detection.
  if c.T_COUNTRY in types_found:
    return types_found[c.T_COUNTRY]

  if c.T_STATE in types_found:
    return types_found[c.T_STATE]

  # At this point, there was no detection possible. Return None.
  return None
