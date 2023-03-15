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
from typing import Any, List
import unittest

import server.routes.api.import_detection.date_detection as dd


class TestDateDetection(unittest.TestCase):

  def test_header_date_detection(self) -> None:

    @dataclass
    class TestHelper:
      name: str
      input: Any
      expected: bool

    test_cases: List[TestHelper] = [
        # Parse successes.
        TestHelper(name="YYYY-MM-DD", input="2020-10-01", expected=True),
        TestHelper(name="YYYY", input="2020", expected=True),
        TestHelper(name="YYYY-MM", input="2020-08", expected=True),
        TestHelper(name="YYYYMMDD", input="20201001", expected=True),

        # Parse failures.
        TestHelper(name="text not ISO 8601",
                   input="March 20, 2020",
                   expected=False),
        TestHelper(name="not ISO 8601", input="03, 20, 2022", expected=False),
        TestHelper(name="MM-DD", input="12-31", expected=False),
        TestHelper(name="MM", input="12", expected=False),
        TestHelper(name="YYYY-DD", input="2020-20", expected=False)
    ]

    for tc in test_cases:
      self.assertEqual(dd.detect_column_header(tc.input),
                       tc.expected,
                       msg="Test named %s failed" % tc.name)

  def test_column_date_detection(self) -> None:

    @dataclass
    class TestHelper:
      name: str
      input: Any
      expected: bool

    test_cases: List[TestHelper] = [
        TestHelper(name="greater-90-percent",
                   input=[
                       "2022",
                       "2021",
                       "2020",
                       "2019",
                       "2018",
                       "2017",
                       "2016",
                       "2015",
                       "2014",
                       "2013",
                       "2012",
                       "2011",
                       "2010",
                       "2009",
                       "2010",
                       "blah",
                   ],
                   expected=True),
        TestHelper(name="greater-90-percent",
                   input=[
                       "2022",
                       "2021",
                       "2020",
                       "2019",
                       "2018",
                       "2017",
                       "2016",
                       "2015",
                       "2014",
                       "2013",
                       "2012",
                       "2011",
                       "2010",
                       "blah",
                       "blah",
                       "blah",
                   ],
                   expected=False),
        TestHelper(name="zero-percent", input=[], expected=False),
    ]

    for tc in test_cases:
      self.assertEqual(dd.detect_column_with_dates(tc.input),
                       tc.expected,
                       msg="Test named %s failed" % tc.name)
