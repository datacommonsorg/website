# Copyright 2025 Google LLC
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
from unittest.mock import MagicMock, patch
import pandas as pd

from tools.nl.nl_metadata import utils


class TestUtils(unittest.TestCase):

  def test_split_into_batches(self):
    # Test with a list that is an exact multiple of the batch size
    data1 = [1, 2, 3, 4, 5, 6]
    result1 = utils.split_into_batches(data1, 2)
    self.assertEqual(len(result1), 3)
    self.assertEqual(result1, [[1, 2], [3, 4], [5, 6]])

    # Test with a list that is not an exact multiple
    data2 = [1, 2, 3, 4, 5]
    result2 = utils.split_into_batches(data2, 2)
    self.assertEqual(len(result2), 3)
    self.assertEqual(result2, [[1, 2], [3, 4], [5]])

    # Test with a list smaller than the batch size
    data3 = [1, 2]
    result3 = utils.split_into_batches(data3, 5)
    self.assertEqual(len(result3), 1)
    self.assertEqual(result3, [[1, 2]])

    # Test with an empty list
    data4 = []
    result4 = utils.split_into_batches(data4, 5)
    self.assertEqual(len(result4), 0)
    self.assertEqual(result4, [])

    # Test with a pandas DataFrame
    df = pd.DataFrame({'col1': [1, 2, 3, 4, 5, 6]})
    result5 = utils.split_into_batches(df, 3)
    self.assertEqual(len(result5), 2)
    self.assertTrue(isinstance(result5[0], pd.DataFrame))
    self.assertEqual(len(result5[0]), 3)
    self.assertEqual(len(result5[1]), 3)

  def test_get_prop_value(self):
    # Test case where 'value' is present
    data1 = {'nodes': [{'value': 'Test Value'}]}
    self.assertEqual(utils.get_prop_value(data1), 'Test Value')

    # Test case where 'name' is present
    data2 = {'nodes': [{'name': 'Test Name'}]}
    self.assertEqual(utils.get_prop_value(data2), 'Test Name')

    # Test case where only 'dcid' is present
    data3 = {'nodes': [{'dcid': 'testDcid'}]}
    self.assertEqual(utils.get_prop_value(data3), 'testDcid')

  def test_extract_constraint_properties_bigquery(self):
    # Mock a BigQuery Row object by using a simple class
    # This ensures getattr(obj, 'non_existent_attr', None) returns None
    class MockBqRow:
      pass

    mock_row = MockBqRow()
    mock_row.p1 = 'prop1'
    mock_row.v1 = 'val1'
    mock_row.p2 = 'prop2'
    mock_row.v2 = 'val2'

    result = utils.extract_constraint_properties_bigquery(mock_row)
    self.assertEqual(len(result), 2)
    self.assertEqual(result, ['prop1: val1', 'prop2: val2'])

  @patch('tools.nl.nl_metadata.utils.get_prop_value')
  def test_extract_constraint_properties_dc_api(self, mock_get_prop_value):
    # Mock the return value of the dependency
    mock_get_prop_value.side_effect = ['val1', 'val2']

    # Mock a DC API response structure
    mock_statvar_data = {
        'constraintProperties': {
            'nodes': [
                {'dcid': 'propDcid1', 'name': 'propName1'},
                {'dcid': 'propDcid2'}  # Test fallback to dcid for name
            ]
        },
        'propDcid1': {'nodes': [{'value': 'val1'}]},
        'propDcid2': {'nodes': [{'name': 'val2'}]}
    }

    result = utils.extract_constraint_properties_dc_api(mock_statvar_data)
    self.assertEqual(len(result), 2)
    self.assertEqual(result, ['propName1: val1', 'propDcid2: val2'])

    # Check that get_prop_value was called correctly
    self.assertEqual(mock_get_prop_value.call_count, 2)
