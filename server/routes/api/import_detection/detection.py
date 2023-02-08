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

import json
from typing import Dict, List, Optional

from flask import Blueprint
from flask import request
from flask import Response

import server.routes.api.import_detection.date_detection as date_detector
from server.routes.api.import_detection.detection_types import Column
from server.routes.api.import_detection.detection_types import MappedThing
from server.routes.api.import_detection.detection_types import MappingType
from server.routes.api.import_detection.detection_types import MappingVal
from server.routes.api.import_detection.detection_types import TypeProperty
import server.routes.api.import_detection.place_detection as place_detector
import server.routes.api.import_detection.utils as utils

SUCCESS_CODE: int = 200
BAD_REQUEST_CODE: int = 400

# Define blueprint
bp = Blueprint("detection", __name__, url_prefix='/api/detection')


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
    col_idx = col.column_idx
    vals = cols_sampled[col_idx]

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
    col_idx = col.column_idx
    vals = cols_sampled[col_idx]

    place: Optional[TypeProperty] = place_detector.detect_column_with_places(
        col_header, vals)
    if place is None:
      continue

    if place.dc_type.dcid == "Country":
      detected_countries[col_idx] = place
    elif place.dc_type.dcid == "State":
      detected_states[col_idx] = place

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

  preferred_idx: Optional[int] = place_detector.preferred_property(
      detected_places, prop_order)
  if preferred_idx is not None:
    prop_type: TypeProperty = detected_places[preferred_idx]
    return MappingVal(type=MappingType.COLUMN.value,
                      column=col_order[preferred_idx],
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
                      column_idx: 0,
                  },
                  Column{
                      id: name_name_1,
                      header: name_name,
                      column_idx: 1,
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


@bp.route('/detect_columns', methods=['POST'])
def detect():
  """Returns the detected column types and properties.

  Expected required parameters:
      column_ids: Dict[str, str]. This is the mapping from column indices (integers as str) to column ids (str).
      column_headers: Dict[str, str]. This is the mapping from column indices (integers as str) to column headers (str).
      column_values: Dict[str, List[str]]. This is the mapping from column indices (integers as str)to column values (List[str]).
  All keys in column_ids (indices) are expected to be present as keys all the other maps. If a key is not
  found, an error is returned. If any parameter is not of the expected format, an error is returned.

  Returns:
      A json response of the detected columns. Sample json response:

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
                      column_idx: 0,
                  },
                  Column{
                      id: name_name_1,
                      header: name_name,
                      column_idx: 1,
                  },
                  ...
              ],
          }
      ]
  """
  # Parse and validate the query params.
  column_order: List[Column] = []
  try:
    # Parsing the input dictionary keys as integers (for column indices).
    column_ids: Dict[int, str] = {
        int(k): v for k, v in request.json["column_ids"].items()
    }
    column_headers: Dict[int, str] = {
        int(k): v for k, v in request.json["column_headers"].items()
    }
    column_values: Dict[int, List[str]] = {
        int(k): v for k, v in request.json["column_values"].items()
    }

    if not utils.check_dict_instance(column_ids, int, str):
      raise TypeError(
          "column_ids must be a Dict mapping integers provided as strings (column indices) to strings (column ids)."
      )
    if not utils.check_dict_instance(column_headers, int, str):
      raise TypeError(
          "column_headers must be a Dict mapping integers provided as strings (column indices) to strings (column headers)."
      )
    if not utils.check_dict_instance(column_values, int, List):
      raise TypeError(
          "column_values must be a Dict mapping integers provided as strings (column indices) to a list of strings (column values)."
      )

    # Also check if all column values are of type str.
    for _, vals in column_values.items():
      for v in vals:
        if not isinstance(v, str):
          raise TypeError("All provided column values must be of type string.")

    # Now convert the inputs to the Column type.
    for col_idx in sorted(column_ids.keys()):
      if col_idx not in column_headers or col_idx not in column_values:
        raise AttributeError(
            "All column indices in column_ids must be found as keys in column_headers and column_values"
        )
      column_order.append(
          Column(id=column_ids[col_idx],
                 header=column_headers[col_idx],
                 column_idx=col_idx))

  except KeyError as key_error:
    return f"TypeError: Missing request parameter {key_error.args[0]}", BAD_REQUEST_CODE

  except TypeError as type_error:
    return f"TypeError: Incorrect request parameter type: {type_error.args[0]}", BAD_REQUEST_CODE

  except AttributeError as attrb_error:
    return f"AttributeError: {attrb_error.args[0]}", BAD_REQUEST_CODE

  return Response(detect_columns(column_order, column_values),
                  SUCCESS_CODE,
                  mimetype='application/json')


@bp.route('/supported_place_properties')
def supported_place_types_properties():
  """Returns the support types and properties for Places.

  No parameters are expected in the query.

  Returns:
      A json response of the list of TypeProperties. Sample json response:

      [
          {
              "dc_type": {
                      "dcid": "Country",
                      "display_name": "Country",
                  },
              "dc_property": {
                      "dcid": "countryNumericCode",
                      "display_name": "Numeric Code",
                  },
          },
          {
              "dc_type": {
                      "dcid": "State",
                      "display_name": "State",
                  },
              "dc_property": {
                      "dcid": "fips52AlphaCode",
                      "display_name": "US State Alpha Code",
                  },
          },
          ...
      ]
  """
  return Response(json.dumps(place_detector.supported_type_properties(),
                             default=vars),
                  SUCCESS_CODE,
                  mimetype='application/json')
