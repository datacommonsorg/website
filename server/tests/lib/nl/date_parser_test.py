# Copyright 2023 Google LLC
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
"""Tests for quantity_parser."""

import unittest

from parameterized import parameterized

from server.lib.nl.common.counters import Counters
from server.lib.nl.detection import date
from server.lib.nl.detection.types import Date


class TestDateParser(unittest.TestCase):

  @parameterized.expand([
      ('USA population in May, 2021', [Date('in', 2021, 5)]),
      ('USA population in Sep 2021', [Date('in', 2021, 9)]),
      ('USA population in 2021', [Date('in', 2021, 0)]),
      ('World temperature before year 2080', [Date('before', 2080, 0)]),
      ('How does california GCP in 2020 compare with year 2010',
       [Date('in', 2020, 0), Date('year', 2010, 0)]),
  ])
  def test_main(self, query, expected):
    ctr = Counters()
    attr = date.parse_date(query, ctr)
    if attr:
      actual = attr.dates
      self.assertEqual(actual, expected)
    else:
      self.assertTrue(not expected)
