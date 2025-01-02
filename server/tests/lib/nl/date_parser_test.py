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

from datetime import date as datetime_date  # Rename to avoid conflict
import unittest
from unittest import mock

from parameterized import parameterized

from server.lib.nl.common.counters import Counters
from server.lib.nl.detection import date
from server.lib.nl.detection.types import Date


class TestDateParser(unittest.TestCase):

  @parameterized.expand([
      ('USA population in may, 2021', [Date('in', 2021, 5)]),
      ('USA population in Sep 2021', [Date('in', 2021, 9)]),
      ('USA population in 2021', [Date('in', 2021, 0)]),
      ('World temperature before year 2080', [Date('before', 2080, 0)]),
      ('How does california GCP in 2020 compare with year 2010',
       [Date('in', 2020, 0), Date('year', 2010, 0)]),
      ('Earthquakes in the last 5 years',
       [Date('last_years', 2019, 0, year_span=0)]),
      ('Flood in previous year', [Date('last_years', 2023, 0, year_span=0)]),
      ('Population over the past decade',
       [Date('last_years', 2014, 0, year_span=0)]),
      ('Female population in Dakota', []),
      ('How has the population in USA changed over time', []),
      ("Female population in California a decade ago", [Date('in', 2014)]),
      ('Female population in California 15 years ago', [Date('in', 2009)])
  ])
  @mock.patch('datetime.date')
  def test_main(self, query, expected, mock_date):
    mock_date.today.return_value = datetime_date(2024, 12, 1)
    ctr = Counters()
    attr = date.parse_date(query, ctr)
    if attr:
      actual = attr.dates
      self.assertEqual(actual, expected)
    else:
      self.assertTrue(not expected)


class TestGetDateRange(unittest.TestCase):

  @parameterized.expand([
      # 'last_years' includes the specified date
      (Date('last_years', 2023, 0, year_span=0), ('2023', '')),
      (Date('last_years', 2023, 2, year_span=0), ('2023-02', '')),
      # 'before' does not include the specified date
      (Date('before', 2080, 0, year_span=0), ('', '2079')),
      (Date('before', 2080, 1, year_span=0), ('', '2079-12')),
      (Date('before', 2080, 2, year_span=0), ('', '2080-01')),
      # 'after' does not include the specified date
      (Date('after', 2020, 0, year_span=0), ('2021', '')),
      (Date('after', 2020, 12, year_span=0), ('2021-01', '')),
      (Date('after', 2020, 2, year_span=0), ('2020-03', '')),
      # 'until' includes the specified date
      (Date('until', 2017, 0, year_span=0), ('', '2017')),
      (Date('until', 2017, 2, year_span=0), ('', '2017-02')),
      # 'since' includes the specified date
      (Date('since', 2017, 0, year_span=0), ('2017', '')),
      (Date('since', 2017, 2, year_span=0), ('2017-02', '')),
      # 'in' is not a date range
      (Date('in', 2021, 5), ('', '')),
      (None, ('', '')),
  ])
  def test_main(self, query, expected):
    result = date.get_date_range_strings(query)
    self.assertEqual(result, expected)
