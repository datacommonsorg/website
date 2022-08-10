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
"""Functions that manage all column detection."""

from routes.api.import_detection.detection_types import Column, MappingVal, MappedThing, MappingType, TypeProperty
from typing import Dict, List, Optional

import json
import routes.api.import_detection.place_detection as place_detector
import routes.api.import_detection.date_detection as date_detector


def _detect_date(col_order: List[Column],
                 cols_sampled: Dict[int, List[str]]) -> Optional[MappingVal]:
    """Process all columns and return the one which best represents the
    detected Date along with its details. If no Date is detected, the
    return value is None.
    @args:
        col_order: A list of Column objects where the list order signifies the column indices.
        cols_sampled: A mapping from column index to a list of strings.
    @returns:
        The detected MappingVal structure or None if no Date is detected.
    """
    date_headers = []
    date_cols = []
    for col in col_order:
        col_header = col.header
        col_ind = col.column_index
        vals = cols_sampled[col_ind]

        if date_detector.detect_column_header(col_header):
            date_headers.append(col)
        if date_detector.detect_column_with_dates(vals):
            date_cols.append(col)

    # If both date_headers and date_cols are non-empty,
    # return the date_headers.
    # If date_headers is empty but date_cols has more
    # than one column, return any (e.g. the first one).
    if date_headers:
        return MappingVal(type=MappingType.COLUMN_HEADER.value,
                          headers=date_headers)
    elif len(date_cols) > 0:
        return MappingVal(type=MappingType.COLUMN.value, column=date_cols[0])

    return None


def _detect_place(col_order: List[Column],
                  cols_sampled: Dict[int, List[str]]) -> Optional[MappingVal]:
    """Process all columns and return the one which best represents the
    detected Place along with its details. If no Place is detected, the
    return value is None.
    @args:
        col_order: A list of Column objects where the list order signifies the column indices.
        cols_sampled: A mapping from column index to a list of strings.
    @returns:
        The detected MappingVal structure or None if no Place is detected.
    """
    # Currently, only country and state detection is supported.
    # detected_states and detected_countries are mappings from the detected
    # column's index to the TypeProperty of the detected Place.
    detected_states: Dict[int, TypeProperty] = {}
    detected_countries: Dict[int, TypeProperty] = {}

    for col in col_order:
        col_header = col.header
        col_ind = col.column_index
        vals = cols_sampled[col_ind]

        place: Optional[
            TypeProperty] = place_detector.detect_column_with_places(
                col_header, vals)
        if place is None:
            continue

        if place.dc_type.dcid == "Country":
            detected_countries[col_ind] = place
        elif place.dc_type.dcid == "State":
            detected_states[col_ind] = place

    # Now get the preferred property detected.
    # Note that State detection is given preference over Country detection
    # because it is more precise.
    detected_places: Dict[int, TypeProperty] = {}
    prop_order: List[str] = {}
    if detected_states:
        detected_places = detected_states
        prop_order = place_detector.STATE_PROP_PREF_ORDER
    elif detected_countries:
        detected_places = detected_countries
        prop_order = place_detector.COUNTRY_PROP_PREF_ORDER

    preferred_ind: Optional[int] = place_detector.preferred_property(
        detected_places, prop_order)
    if preferred_ind is not None:
        prop_type: TypeProperty = detected_places[preferred_ind]
        return MappingVal(type=MappingType.COLUMN.value,
                          column=col_order[preferred_ind],
                          place_property=prop_type.dc_property,
                          place_type=prop_type.dc_type)

    return None


def detect_columns(col_order: List[Column],
                   cols_sampled: Dict[int, List[str]]) -> str:
    """Returns a json string corresponding to the detection for each column.
    @args:
        col_order: A list of Column objects where the list order signifies the column indices.
        cols_sampled: A mapping from column index to a list of strings.
    @returns:
        The json string is of the following form (examples):

        Example # 1: Date is detected in one column.
        [
            Place: {
                type : column,
                column: None,
                place_type: {
                    dcid: Country,
                    display_name: Country,
                }
                place_property: {
                    dcid: isoCode,
                    display_name: ISO Code,
                },
                headers: None,
            },
            Date: {
                type : column,
                place_type: None
                place_property: None,
                headers: None,
            }
        ]

        Example # 2: Date is detected in column headers.
        [
            Place: {
                type : column,
                column: None,
                place_type: {
                    dcid: Country,
                    display_name: Country,
                }
                place_property: {
                    dcid: isoCode,
                    display_name: ISO Code,
                },
                headers: None,
            },
            Date: {
                type : column,
                place_type: None,
                place_property: None,
                headers: [
                    Column{
                        id: name_0,
                        header: name,
                        column_index: 0,
                    },
                    Column{
                        id: name_name_1,
                        header: name_name,
                        column_index: 1,
                    },
                    ...
                ],
            }
        ]
    """
    mapping: Dict[str, MappingVal] = {}

    # Place detection.
    p_detected = _detect_place(col_order, cols_sampled)
    if p_detected is not None:
        mapping.update({MappedThing.PLACE.value: p_detected})

    # Date detection.
    d_detected = _detect_date(col_order, cols_sampled)
    if d_detected is not None:
        mapping.update({MappedThing.DATE.value: d_detected})

    return json.dumps(mapping, default=vars)
