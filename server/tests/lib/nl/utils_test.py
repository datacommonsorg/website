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

  @parameterized.expand([
      [
          Date(prep="", year=2020), TEST_FACET_DATA_YYYY,
          TEST_FACET_METADATA_YYYY, True
      ],
      [Date(prep="", year=2020), TEST_FACET_DATA_YYYY, {}, True],
      [
          Date(prep="", year=2012), TEST_FACET_DATA_YYYY,
          TEST_FACET_METADATA_YYYY, False
      ],
      [
          Date(prep="", year=2026), TEST_FACET_DATA_YYYY,
          TEST_FACET_METADATA_YYYY, False
      ],
      [
          Date(prep="", year=2021), TEST_FACET_DATA_YYYY,
          TEST_FACET_METADATA_YYYY, False
      ],
      [
          Date(prep="", year=2020), TEST_FACET_DATA_YYYY_MM,
          TEST_FACET_METADATA_YYYY_MM, False
      ],
      [
          Date(prep="", year=2020, month=1), TEST_FACET_DATA_YYYY_MM,
          TEST_FACET_METADATA_YYYY_MM, True
      ],
      [Date(prep="", year=2020, month=1), TEST_FACET_DATA_YYYY_MM, {}, False],
      [
          Date(prep="", year=2014, month=12), TEST_FACET_DATA_YYYY_MM,
          TEST_FACET_METADATA_YYYY_MM, False
      ],
      [
          Date(prep="", year=2025, month=2), TEST_FACET_DATA_YYYY_MM,
          TEST_FACET_METADATA_YYYY_MM, False
      ],
  ])
  def test_main(self, date, facet_data, facet_metadata, expected):
    result = utils._facet_contains_date(facet_data, facet_metadata, date)
    self.assertEqual(result, expected)
