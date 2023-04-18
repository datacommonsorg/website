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
import copy
from dataclasses import dataclass
import json
from typing import Any, List
import unittest

from web_app import app


class TestDetection(unittest.TestCase):

  def test_place_type_properties(self):
    response = app.test_client().get(
        "/api/detection/supported_place_properties")
    self.assertEqual(response.status_code, 200)

    response_type_prop_list = json.loads(response.data.decode("utf-8"))
    self.assertEqual(len(response_type_prop_list), 6)

    # Check that two of the elements below are in the response.
    expected_element_1 = {
        "dc_type": {
            "dcid": "Country",
            "display_name": "Country"
        },
        "dc_property": {
            "dcid": "isoCode",
            "display_name": "ISO Code"
        },
    }
    self.assertTrue(expected_element_1 in response_type_prop_list)

    expected_element_2 = {
        "dc_type": {
            "dcid": "State",
            "display_name": "State"
        },
        "dc_property": {
            "dcid": "geoId",
            "display_name": "FIPS Code"
        },
    }
    self.assertTrue(expected_element_2 in response_type_prop_list)

    # Check that the dc_type field only has "Country" and "State".
    dc_types = set()
    for tp in response_type_prop_list:
      dc_types.add(tp["dc_type"]["dcid"])

    self.assertEqual(len(dc_types), 2)
    self.assertTrue("Country" in dc_types)
    self.assertTrue("State" in dc_types)

  def test_non_empty_response(self):
    req_dict = {
        "column_ids": {
            0: "a"
        },
        "column_headers": {
            0: "random"
        },
        "column_values": {
            0: ["USA", "NOR"]
        }
    }
    response = app.test_client().post("/api/detection/detect_columns",
                                      json=req_dict)

    expected_response = json.dumps(
        {
            "Place": {
                "type": "column",
                "column": {
                    "id": "a",
                    "header": "random",
                    "column_idx": 0
                },
                "place_property": {
                    "dcid": "countryAlpha3Code",
                    "display_name": "Alpha 3 Code"
                },
                "place_type": {
                    "dcid": "Country",
                    "display_name": "Country"
                },
                "headers": None,
            }
        },
        default=vars)
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data.decode("utf-8"), expected_response)

  def test_empty_response(self):
    # This request should get no column detection.
    req_dict = {
        "column_ids": {
            0: "a"
        },
        "column_headers": {
            0: "a"
        },
        "column_values": {
            0: ["000"]
        }
    }
    response = app.test_client().post("/api/detection/detect_columns",
                                      json=req_dict)

    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data.decode("utf-8"), '{}')

  def test_empty_response_with_empty_input(self):
    # This request only has empty dictionaries. It should get no
    # column detection but also return a 200 OK.
    req_dict = {"column_ids": {}, "column_headers": {}, "column_values": {}}
    response = app.test_client().post("/api/detection/detect_columns",
                                      json=req_dict)

    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data.decode("utf-8"), '{}')

  def test_missing_required_param_assertion(self):
    req_dict = {
        "column_ids": {
            0: "a"
        },
        "column_headers": {
            0: "a"
        },
        "column_values": {
            0: ["USA", "NOR"]
        }
    }
    response = app.test_client().post("/api/detection/detect_columns",
                                      json=req_dict)

    # The base request gets 200 OK.
    self.assertEqual(response.status_code, 200)

    # Modify req_dict to remove one param at a time. Should result in 400 response.
    for k in req_dict:
      req_copy = copy.deepcopy(req_dict)
      del req_copy[k]
      response = app.test_client().post("/api/detection/detect_columns",
                                        json=req_copy)
      self.assertEqual(response.status_code, 400)

  def test_wrong_format_assertions(self):

    @dataclass
    class TestHelper:
      name: str
      input: Any
      expected: int

    test_cases: List[TestHelper] = [
        TestHelper(name="no assertion",
                   input={
                       "column_ids": {
                           0: "a",
                       },
                       "column_headers": {
                           0: "a"
                       },
                       "column_values": {
                           0: ["USA", "NOR"]
                       }
                   },
                   expected=200),
        TestHelper(
            name="column_ids is a list",
            input={
                "column_ids": {
                    0: ["a"],  # should not be a list.
                },
                "column_headers": {
                    0: "a"
                },
                "column_values": {
                    0: ["USA", "NOR"]
                }
            },
            expected=400),
        TestHelper(
            name="column_headers is a dict",
            input={
                "column_ids": {
                    0: "a",
                },
                "column_headers": {
                    0: {
                        "a": "b"
                    },  # should not be a dict.
                },
                "column_values": {
                    0: ["USA", "NOR"]
                }
            },
            expected=400),
        TestHelper(
            name="column_values are not a list",
            input={
                "column_ids": {
                    0: "a",
                },
                "column_headers": {
                    0: {
                        "a": "b"
                    },  # should not be a dict.
                },
                "column_values": {
                    0: "USA"  # should not be a string.
                }
            },
            expected=400),
        TestHelper(
            name="column index not in column_values",
            input={
                "column_ids": {
                    0: "a",
                },
                "column_headers": {
                    0: {
                        "a": "b"
                    },  # should not be a dict.
                },
                "column_values": {
                    1: ["USA", "NOR"]  # index 0 does not exist.
                }
            },
            expected=400),
    ]

    for tc in test_cases:
      response = app.test_client().post("/api/detection/detect_columns",
                                        json=tc.input)
      self.assertEqual(response.status_code, tc.expected)
