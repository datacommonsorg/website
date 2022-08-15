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
import json
import unittest

from dataclasses import dataclass
from main import app
from typing import Any, List


class TestDetection(unittest.TestCase):

    def test_non_empty_response(self):
        req_dict = {
            "column_idx_order": [0],
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
                                          json=json.dumps(req_dict,
                                                          default=vars))

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
            "column_idx_order": [0],
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
                                          json=json.dumps(req_dict,
                                                          default=vars))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.decode("utf-8"), '{}')

    def test_missing_required_param_assertion(self):
        req_dict = {
            "column_idx_order": [0],
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
                                          json=json.dumps(req_dict,
                                                          default=vars))

        # The base request gets 200 OK.
        self.assertEqual(response.status_code, 200)

        # Modify req_dict to remove one param at a time. Should result in 400 response.
        for k in req_dict:
            req_copy = copy.deepcopy(req_dict)
            del req_copy[k]
            response = app.test_client().post("/api/detection/detect_columns",
                                              json=json.dumps(req_copy,
                                                              default=vars))
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
                           "column_idx_order": [0],
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
                    "column_idx_order": [0],
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
                    "column_idx_order": [0],
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
                    "column_idx_order": [0],
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
                    "column_idx_order": [0],
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
                                              json=json.dumps(tc.input,
                                                              default=vars))
            self.assertEqual(response.status_code, tc.expected)
