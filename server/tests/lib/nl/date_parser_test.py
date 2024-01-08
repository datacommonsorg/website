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
      ('Earthquakes in the last 5 years',
       [Date('before', 2023, 0, year_span=5)]),
      ('Flood in previous year', [Date('before', 2023, 0, year_span=1)]),
      ('Population over the past decade',
       [Date('before', 2023, 0, year_span=10)]),
      ('Female population in Dakota', []),
      ('How has the population in USA changed over time', []),
  ])
  def test_main(self, query, expected):
    ctr = Counters()
    attr = date.parse_date(query, ctr)
    if attr:
      actual = attr.dates
      self.assertEqual(actual, expected)
    else:
      self.assertTrue(not expected)


class TestGetDateRange(unittest.TestCase):

  @parameterized.expand([
      (Date('in', 2021, 5), ('', '')),
      (Date('before', 2080, 0), ('', '2080')),
      (Date('after', 2021, 5), ('2021-05', '')),
      (Date('before', 2022, 0, year_span=5), ('2018', '2022')),
      (Date('before', 2022, 0, year_span=1), ('2022', '2022')),
      (Date('after', 2022, 0, year_span=1), ('2022', '2022')),
      (Date("until", 2017, 2, year_span=0), ('', '2017-02')),
      (Date("after", 2017, 2, year_span=0), ('2017-02', '')),
      (None, ('', '')),
  ])
  def test_main(self, query, expected):
    result = date.get_date_range_strings(query)
    self.assertEqual(result, expected)
