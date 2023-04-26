# Copyright 2020 Google LLC
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

import unittest
from unittest.mock import patch

import server.routes.api.shared as shared


class TestNames(unittest.TestCase):

  @patch('server.routes.api.shared.util.property_values')
  def test_names(self, mock_property_values_func):
    dcid1 = 'geoId/06'
    dcid2 = 'geoId/07'
    dcid3 = 'geoId/08'
    mock_response = {dcid1: ['California'], dcid2: [], dcid3: ['Colorado']}
    mock_property_values_func.side_effect = (lambda dcids, name: mock_response)
    result = shared.names([dcid1, dcid2, dcid3])
    assert result == {dcid1: 'California', dcid2: '', dcid3: 'Colorado'}


class TestIsFloat(unittest.TestCase):

  def test_is_float(self):
    cases = [{
        'query': 'abc',
        'expected': False
    }, {
        'query': '1.26',
        'expected': True
    }, {
        'query': '-',
        'expected': False
    }, {
        'query': '0.0',
        'expected': True
    }, {
        'query': '3',
        'expected': True
    }]
    for test_case in cases:
      result = shared.is_float(test_case.get("query"))
      assert result == test_case.get("expected")


class TestIsValidDate(unittest.TestCase):

  def test_is_valid_date(self):
    cases = [{
        'date': 'latest',
        'expected': True
    }, {
        'date': '',
        'expected': True
    }, {
        'date': '2020',
        'expected': True
    }, {
        'date': '2020-01',
        'expected': True
    }, {
        'date': '2020-01-01',
        'expected': True
    }, {
        'date': '20211',
        'expected': False
    }, {
        'date': '2020-011',
        'expected': False
    }, {
        'date': '2021-01-910',
        'expected': False
    }, {
        'date': 'abc',
        'expected': False
    }]
    for test_case in cases:
      result = shared.is_valid_date(test_case.get("date"))
      assert result == test_case.get("expected")


class TestDateGreaterEqualMin(unittest.TestCase):

  def test_date_greater_equal_min(self):
    cases = [{
        'date': '',
        'min_date': '',
        'expected': False
    }, {
        'date': '2020',
        'min_date': '',
        'expected': True
    }, {
        'date': '2020',
        'min_date': '2020',
        'expected': True
    }, {
        'date': '2021',
        'min_date': '2020',
        'expected': True
    }, {
        'date': '2020',
        'min_date': '2020-01',
        'expected': True
    }, {
        'date': '2021',
        'min_date': '2020-01',
        'expected': True
    }, {
        'date': '2020-01',
        'min_date': '2020',
        'expected': True
    }, {
        'date': '2021-01',
        'min_date': '2020',
        'expected': True
    }, {
        'date': '2020',
        'min_date': '2021',
        'expected': False
    }]
    for test_case in cases:
      result = shared.date_greater_equal_min(test_case.get("date"),
                                             test_case.get("min_date"))
      assert result == test_case.get("expected")


class TestDateLesserEqualMax(unittest.TestCase):

  def test_date_lesser_equal_max(self):
    cases = [{
        'date': '',
        'max_date': '',
        'expected': False
    }, {
        'date': '2020',
        'max_date': '',
        'expected': True
    }, {
        'date': '2020',
        'max_date': '2020',
        'expected': True
    }, {
        'date': '2019',
        'max_date': '2020',
        'expected': True
    }, {
        'date': '2020',
        'max_date': '2020-01',
        'expected': True
    }, {
        'date': '2019',
        'max_date': '2020-01',
        'expected': True
    }, {
        'date': '2020-01',
        'max_date': '2020',
        'expected': True
    }, {
        'date': '2019-01',
        'max_date': '2020',
        'expected': True
    }, {
        'date': '2022',
        'max_date': '2021',
        'expected': False
    }]
    for test_case in cases:
      result = shared.date_lesser_equal_max(test_case.get("date"),
                                            test_case.get("max_date"))
      assert result == test_case.get("expected")
