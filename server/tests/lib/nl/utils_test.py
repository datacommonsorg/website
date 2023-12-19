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
"""Tests for utils functions."""

import unittest

from parameterized import parameterized

import server.lib.nl.common.utils as utils
from server.lib.nl.detection.types import Date

TEST_FACET_DATA_YYYY = {
    'facet': "test",
    'obsCount': 3,
    'earliestDate': '2015',
    'latestDate': '2025'
}
TEST_FACET_METADATA_YYYY = {'observationPeriod': 'P5Y'}
TEST_FACET_DATA_YYYY_MM = {
    'facet': "test",
    'obsCount': 20,
    'earliestDate': '2015-01',
    'latestDate': '2025-01'
}
TEST_FACET_METADATA_YYYY_MM = {'observationPeriod': 'P6M'}


class TestFacetContainsDate(unittest.TestCase):

  @parameterized.expand(
      [[
          Date(prep="", year=2020), None, TEST_FACET_DATA_YYYY,
          TEST_FACET_METADATA_YYYY, True
      ], [Date(prep="", year=2020), None, TEST_FACET_DATA_YYYY, {}, True],
       [
           Date(prep="", year=2012), None, TEST_FACET_DATA_YYYY,
           TEST_FACET_METADATA_YYYY, False
       ],
       [
           Date(prep="", year=2026), None, TEST_FACET_DATA_YYYY,
           TEST_FACET_METADATA_YYYY, False
       ],
       [
           Date(prep="", year=2021), None, TEST_FACET_DATA_YYYY,
           TEST_FACET_METADATA_YYYY, False
       ],
       [
           Date(prep="", year=2020), None, TEST_FACET_DATA_YYYY_MM,
           TEST_FACET_METADATA_YYYY_MM, False
       ],
       [
           Date(prep="", year=2020, month=1), None, TEST_FACET_DATA_YYYY_MM,
           TEST_FACET_METADATA_YYYY_MM, True
       ],
       [
           Date(prep="", year=2020, month=1), None, TEST_FACET_DATA_YYYY_MM, {},
           False
       ],
       [
           Date(prep="", year=2014, month=12), None, TEST_FACET_DATA_YYYY_MM,
           TEST_FACET_METADATA_YYYY_MM, False
       ],
       [
           Date(prep="", year=2025, month=2), None, TEST_FACET_DATA_YYYY_MM,
           TEST_FACET_METADATA_YYYY_MM, False
       ],
       [
           None,
           Date(prep="before", year=2022, month=2, year_span=3),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, True
       ],
       [
           None,
           Date(prep="after", year=2024, month=2, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, True
       ],
       [
           None,
           Date(prep="until", year=2017, month=2, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, True
       ],
       [
           None,
           Date(prep="after", year=2013, month=2, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, True
       ],
       [
           None,
           Date(prep="before", year=2015, month=0, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, True
       ],
       [
           None,
           Date(prep="after", year=2025, month=0, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, True
       ],
       [
           None,
           Date(prep="before", year=2015, month=3, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY, True
       ],
       [
           None,
           Date(prep="before", year=2025, month=4, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY, True
       ],
       [
           None,
           Date(prep="until", year=2013, month=2, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, False
       ],
       [
           None,
           Date(prep="after", year=2026, month=2, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, False
       ]])
  def test_main(self, single_date, date_range, facet_data, facet_metadata,
                expected):
    result = utils._facet_contains_date(facet_data, facet_metadata, single_date,
                                        date_range)
    self.assertEqual(result, expected)
