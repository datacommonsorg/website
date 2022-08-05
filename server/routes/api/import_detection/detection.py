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

import routes.api.import_detection.date_detection as date_detector
from routes.api.import_detection.detection_types import Column, MappingVal, MappedThing, MappingType
from typing import Dict, List, Optional

import json


def _detect_date(col_order: List[Column],
                 cols_sampled: Dict[int, List[str]]) -> Optional[MappingVal]:

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


def detect_columns(col_order: List[Column],
                   cols_sampled: Dict[int, List[str]]) -> str:
    """Returns a json string corresponding to the detection for each column.
    @args:
        col_order: A list of Column objects where the list order signifies the column indices.
        cols_sampled: A mapping from column index to a list of strings.
    @returns:
        The json string is of the following form (examples):

        Example # 1: Date is detected in one column.
        {
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
        }

        Example # 2: Date is detected in column headers.
        {
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
        }
    """
    mapping: Dict[str, MappingVal] = {}

    # Date detection.
    d_detected = _detect_date(col_order, cols_sampled)
    if d_detected is not None:
        mapping.update({MappedThing.DATE.value: d_detected})

    return json.dumps(d_detected, default=vars)
