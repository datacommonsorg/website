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

import server.lib.shared as shared


class TestNames(unittest.TestCase):

  @patch('server.lib.shared.fetch.property_values')
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

class TestDivideIntoBatches(unittest.TestCase):
  
  def test_divide_into_batches(self):
    cases = [{
        'all_items': ['1','2','3','4','5','6','7'],
        'batch_size': 3,
        'expected': [['1','2','3'],
                    ['4','5','6'],
                    ['7']]
    }]
    for test_case in cases:
      result = list(shared.divide_into_batches(test_case.get("all_items"),
                                               test_case.get("batch_size")))
      assert result == test_case.get("expected")


class TestMergeResponses(unittest.TestCase):
  
  def test_merge_responses(self):
    response_A = {
        "facets": {
        "12345678": {"importName": "import", "provenanceUrl": "url"}
        },
        "data": {
            "variable_1": {
                "entity_1": {
                    "date": "20XX",
                    "value": 1234,
                },
            },
            "variable_2": {
                "entity_1": {
                    "date": "20YY",
                    "value": 5678,
                },
            },
        },
    }
    response_B = {
        "facets": {
        "87654321": {"importName": "other_import", "provenanceUrl": "other_url"}
        },
        "data": {
            "variable_1": {
                "entity_2": {
                    "date": "20XX",
                    "value": 3456,
                },
            },
            "variable_2": {
                "entity_2": {
                    "date": "20YY",
                    "value": 7890,
                },
            },
        },
    }
    response_A_and_B = {
      "facets": {
        "12345678": {"importName": "import", "provenanceUrl": "url"},
        "87654321": {"importName": "other_import", "provenanceUrl": "other_url"}
      },
      "data": {
            "variable_1": {
                "entity_1": {
                    "date": "20XX",
                    "value": 1234,
                },
                "entity_2": {
                    "date": "20XX",
                    "value": 3456,
                },
            },
            "variable_2": {
                "entity_1": {
                    "date": "20YY",
                    "value": 5678,
                },
                "entity_2": {
                    "date": "20YY",
                    "value": 7890,
                },
            },
        },
    }
    cases = [{
      'resp_1': {},
      'resp_2': response_B,
      'expected': response_B,
    }, {
      'resp_1': response_A,
      'resp_2': {},
      'expected': response_A,
    },{
      'resp_1': response_A,
      'resp_2': response_B,
      'expected': response_A_and_B,
    }]
    for test_case in cases:
      result = shared.merge_responses(test_case.get("resp_1"),
                                            test_case.get("resp_2"))
      assert result == test_case.get("expected")
      self.assertDictEqual(result, test_case.get("expected"))
      