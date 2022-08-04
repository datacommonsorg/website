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

from typing import Dict, List
from routes.api.import_detection.detection_types import Column

import json
import routes.api.import_detection.detection as detection
import unittest


class TestDetection(unittest.TestCase):

    def test_date_detection_headers(self) -> None:

        cols_sampled: Dict[int, List[str]] = {0: [], 1: [], 2: []}

        date_col_1 = Column(id="2020-100", header="2020-10", column_index=0)
        date_col_2 = Column(id="2020-111", header="2020-11", column_index=1)
        col_other = Column(id="a2", header="a", column_index=2)

        got: str = detection.detect_columns([date_col_1, date_col_2, col_other],
                                            cols_sampled)
        expected: str = json.dumps({
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
                "column_index": 0
            }, {
                "id": "2020-111",
                "header": "2020-11",
                "column_index": 1
            }]
        })
        self.assertEqual(got, expected)

    def test_date_detection_columns(self) -> None:

        cols_sampled: Dict[int, Sequence[str]] = {
            0: ["2020-10", "2021-10", "2022-10"],
            1: ["random", "random", "random"],
            2: ["1", "2", "3"]
        }

        date_col = Column(id="a0", header="a", column_index=0)
        col_other_1 = Column(id="b1", header="b", column_index=1)
        col_other_2 = Column(id="c2", header="c", column_index=2)

        got: str = detection.detect_columns(
            [date_col, col_other_1, col_other_2], cols_sampled)
        expected: str = json.dumps({
            "type": "column",
            "column": {
                "id": "a0",
                "header": "a",
                "column_index": 0
            },
            "place_property": None,
            "place_type": None,
            "headers": None
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

        date_header_1 = Column(id="a0", header="2022-10", column_index=0)
        date_header_2 = Column(id="b1", header="2023-10", column_index=1)
        date_col = Column(id="c2", header="c", column_index=2)

        got: str = detection.detect_columns(
            [date_header_1, date_header_2, date_col], cols_sampled)
        expected: str = json.dumps({
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
                "column_index": 0
            }, {
                "id": "b1",
                "header": "2023-10",
                "column_index": 1
            }]
        })
        self.assertEqual(got, expected)
