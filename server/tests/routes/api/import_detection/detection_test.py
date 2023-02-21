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

from dataclasses import dataclass
import json
from typing import Dict, List, Optional
import unittest

import server.routes.api.import_detection.detection as detection
from server.routes.api.import_detection.detection_types import Column
from server.routes.api.import_detection.detection_types import DCProperty


class TestDetection(unittest.TestCase):

  def test_date_detection_headers(self) -> None:

    cols_sampled: Dict[int, List[str]] = {0: [], 1: [], 2: []}

    date_col_1 = Column(id="2020-100", header="2020-10", column_idx=0)
    date_col_2 = Column(id="2020-111", header="2020-11", column_idx=1)
    col_other = Column(id="a2", header="a", column_idx=2)

    got: str = detection.detect_columns([date_col_1, date_col_2, col_other],
                                        cols_sampled)
    expected: str = json.dumps({
        "Date": {
            "type":
                "columnHeader",
            "column":
                None,
            "place_property":
                None,
            "place_type":
                None,
            "headers": [{
                "id": "2020-100",
                "header": "2020-10",
                "column_idx": 0
            }, {
                "id": "2020-111",
                "header": "2020-11",
                "column_idx": 1
            }]
        }
    })
    self.assertEqual(got, expected)

  def test_date_detection_columns(self) -> None:

    cols_sampled: Dict[int, List[str]] = {
        0: ["2020-10", "2021-10", "2022-10"],
        1: ["random", "random", "random"],
        2: ["1", "2", "3"]
    }

    date_col = Column(id="a0", header="a", column_idx=0)
    col_other_1 = Column(id="b1", header="b", column_idx=1)
    col_other_2 = Column(id="c2", header="c", column_idx=2)

    got: str = detection.detect_columns([date_col, col_other_1, col_other_2],
                                        cols_sampled)
    expected: str = json.dumps({
        "Date": {
            "type": "column",
            "column": {
                "id": "a0",
                "header": "a",
                "column_idx": 0
            },
            "place_property": None,
            "place_type": None,
            "headers": None
        }
    })
    self.assertEqual(got, expected)

  def test_date_detection_headers_and_columns(self) -> None:

    # Column at index 2 is a date column but preference is given to column
    # headers.
    cols_sampled: Dict[int, List[str]] = {
        0: ["1", "2", "3"],
        1: ["random", "random", "random"],
        2: ["2020-10", "2021-10", "2022-10"],
    }

    date_header_1 = Column(id="a0", header="2022-10", column_idx=0)
    date_header_2 = Column(id="b1", header="2023-10", column_idx=1)
    date_col = Column(id="c2", header="c", column_idx=2)

    got: str = detection.detect_columns(
        [date_header_1, date_header_2, date_col], cols_sampled)
    expected: str = json.dumps({
        "Date": {
            "type":
                "columnHeader",
            "column":
                None,
            "place_property":
                None,
            "place_type":
                None,
            "headers": [{
                "id": "a0",
                "header": "2022-10",
                "column_idx": 0
            }, {
                "id": "b1",
                "header": "2023-10",
                "column_idx": 1
            }]
        }
    })
    self.assertEqual(got, expected)

  def test_country_detection(self) -> None:

    cols_sampled: Dict[int, List[str]] = {
        0: ["USA",
            "ITA"],  # This column should be detected as a Place (country).
        1: ["random"],
        2: ["dfds"],
    }

    colCountry = Column(id="a0", header="a", column_idx=0)
    colOther1 = Column(id="b1", header="b", column_idx=1)
    colOther2 = Column(id="c2", header="c", column_idx=2)

    got: str = detection.detect_columns([colCountry, colOther1, colOther2],
                                        cols_sampled)
    expected: str = json.dumps({
        "Place": {
            "type": "column",
            "column": {
                "id": "a0",
                "header": "a",
                "column_idx": 0
            },
            "place_property": {
                "dcid": "countryAlpha3Code",
                "display_name": "Alpha 3 Code",
            },
            "place_type": {
                "dcid": "Country",
                "display_name": "Country",
            },
            "headers": None,
        }
    })
    self.assertEqual(got, expected)

  def test_country_detection_two_columns(self) -> None:

    # One of the two columns below should be detected. They are both countries.
    cols_sampled: Dict[int, List[str]] = {
        0: ["USA", "ITA"],
        1: ["USA"],
        2: ["dfds"],
    }

    colCountry = Column(id="a0", header="a", column_idx=0)
    colCountryOther = Column(id="b1", header="b", column_idx=1)
    colOther2 = Column(id="c2", header="c", column_idx=2)

    got = json.loads(
        detection.detect_columns([colCountry, colCountryOther, colOther2],
                                 cols_sampled))
    expected = {
        "Place": {
            "type": "column",
            "column": {
                "id": "a0",
                "header": "a",
                "column_idx": 0
            },
            "place_property": {
                "dcid": "countryAlpha3Code",
                "display_name": "Alpha 3 Code",
            },
            "place_type": {
                "dcid": "Country",
                "display_name": "Country",
            },
            "headers": None,
        }
    }
    # Detected index is either 0 and 1.
    self.assertIn(got["Place"]["column"]["column_idx"], [0, 1])
    self.assertEqual(got["Place"]["place_property"],
                     expected["Place"]["place_property"])
    self.assertEqual(got["Place"]["place_type"],
                     expected["Place"]["place_type"])

  def test_country_detection_order(self) -> None:

    col_iso = "iso"
    col_alpha3 = "alpha3"
    col_number = "number"

    # col_name does not provide any help with choosing between numeric country
    # codes vs FIPS codes for US states.
    col_name = "name"
    col_iso_mistake = "isoMistake"

    col_vals: Dict[str, List[str]] = {
        "iso": ["US", "IT"],
        "alpha3": ["USA", "ITA"],
        "number": ["840", "380"],
        "name": ["United States", "italy "],
        "isoMistake": ["U", "IFH"],
    }

    @dataclass
    class TestHelper:
      name: str
      col_names_order: List[str]
      expected_col: Optional[Column]
      expected_prop: Optional[DCProperty]

    test_cases: List[TestHelper] = [
        TestHelper(name="all-properties",
                   col_names_order=[col_iso, col_alpha3, col_number, col_name],
                   expected_col=Column(id=col_iso + "0",
                                       header=col_iso,
                                       column_idx=0),
                   expected_prop=DCProperty(dcid="isoCode",
                                            display_name="ISO Code")),
        TestHelper(name="iso-missing",
                   col_names_order=[col_number, col_name, col_alpha3],
                   expected_col=Column(id=col_alpha3 + "2",
                                       header=col_alpha3,
                                       column_idx=2),
                   expected_prop=DCProperty(dcid="countryAlpha3Code",
                                            display_name="Alpha 3 Code")),
        TestHelper(name="iso-alpha3-missing",
                   col_names_order=[col_number, col_name],
                   expected_col=Column(id=col_number + "0",
                                       header=col_number,
                                       column_idx=0),
                   expected_prop=DCProperty(dcid="countryNumericCode",
                                            display_name="Numeric Code")),
        TestHelper(name="only-name",
                   col_names_order=[col_name],
                   expected_col=Column(id=col_name + "0",
                                       header=col_name,
                                       column_idx=0),
                   expected_prop=DCProperty(dcid="name", display_name="Name")),
        TestHelper(name="none-found",
                   col_names_order=[],
                   expected_col=None,
                   expected_prop=None),
        TestHelper(
            name="all-properties-iso-with-typos",
            col_names_order=[col_iso_mistake, col_alpha3, col_number, col_name],
            expected_col=Column(id=col_alpha3 + "1",
                                header=col_alpha3,
                                column_idx=1),
            expected_prop=DCProperty(dcid="countryAlpha3Code",
                                     display_name="Alpha 3 Code")),
    ]

    for tc in test_cases:
      col_vals_sampled: Dict[int, List[str]] = {}
      ordered_cols: List[Column] = []
      for i, c_name in enumerate(tc.col_names_order):
        col_vals_sampled[i] = col_vals[c_name]
        ordered_cols.append(
            Column(id=c_name + str(i), header=c_name, column_idx=i))

      got: str = detection.detect_columns(ordered_cols, col_vals_sampled)

      if tc.expected_prop is None:
        self.assertEqual(got, "{}")
        continue

      expected: str = json.dumps(
          {
              "Place": {
                  "type": "column",
                  "column": tc.expected_col,
                  "place_property": tc.expected_prop,
                  "place_type": {
                      "dcid": "Country",
                      "display_name": "Country",
                  },
                  "headers": None,
              }
          },
          default=vars)

      self.assertEqual(got, expected)

  def test_date_and_country_detection(self) -> None:
    # Column at index 2 is a date column but preference is given to column
    # headers.
    # There are also three place columns: one each which correspond to country
    # and state unambiguously while the third one could be either country or
    # state. For the ambiguous column, the header name "state" is provided which
    # will give preference to "State" detection for that column. Therefore, there
    # are two State columns and one Country column detected. In picking one Place
    # column, preference is given to State over Country and within States, the
    # preference is given to fips52AlphaCode over the FIPS (numeric) codes.
    columns: Dict[int, List[str]] = {
        0: ["1", "2", "3"],
        1: ["random", "random", "random"],
        2: ["2020-10", "2021-10", "2022-10"],
        3: ["US", "IT", "ES"],
        4: ["WY", "FL", "NJ"],
        5: ["36", "40", "50"],  # numeric country code OR FIPS state code.
    }

    date_col_header_1: Column = Column(id="2022-100",
                                       header="2022-10",
                                       column_idx=0)
    date_col_header_2: Column = Column(id="2022-111",
                                       header="2022-11",
                                       column_idx=1)
    date_col: Column = Column(id="c2", header="c", column_idx=2)
    country_col: Column = Column(id="d3", header="d", column_idx=3)
    state_col: Column = Column(id="e4", header="e", column_idx=4)
    state_numeric_col: Column = Column(id="state5",
                                       header="state",
                                       column_idx=5)

    got = detection.detect_columns([
        date_col_header_1, date_col_header_2, date_col, country_col, state_col,
        state_numeric_col
    ], columns)

    expected: str = json.dumps(
        {
            "Date": {
                "type":
                    "columnHeader",
                "column":
                    None,
                "place_property":
                    None,
                "place_type":
                    None,
                "headers": [{
                    "id": "2022-100",
                    "header": "2022-10",
                    "column_idx": 0
                }, {
                    "id": "2022-111",
                    "header": "2022-11",
                    "column_idx": 1
                }]
            },
            "Place": {
                "type": "column",
                "column": state_col,
                "place_property": {
                    "dcid": "fips52AlphaCode",
                    "display_name": "US State Alpha Code",
                },
                "place_type": {
                    "dcid": "State",
                    "display_name": "State",
                },
                "headers": None,
            }
        },
        default=vars)

    self.assertDictEqual(json.loads(got), json.loads(expected))
