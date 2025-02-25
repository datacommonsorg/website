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

import json
import os
import unittest
from unittest import mock

from server.services.datacommons import v2node

MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
TEST_DATA_DIR = os.path.join(MODULE_DIR, "..", "test_data", "datacommons")


def get_json(filename):
  if not filename.lower().endswith(".json"):
    filename += ".json"
  filepath = os.path.join(TEST_DATA_DIR, filename)
  with open(filepath, "r") as f:
    return json.load(f)


class TestServiceDataCommonsV2Node(unittest.TestCase):

  @mock.patch('server.services.datacommons.post')
  def test_termination_condition_max_pages_fetched(self, mock_post):
    response_with_next_token = get_json('v2node_response_with_next_token')
    mock_post.side_effect = [response_with_next_token, response_with_next_token]

    v2node(['dc/1', 'dc/2'], '->{property1,property2}', max_pages=2)

    assert mock_post.call_count == 2

  @mock.patch('server.services.datacommons.post')
  def test_termination_condition_no_next_token(self, mock_post):
    response_without_next_token = get_json('v2node_response_without_next_token')
    mock_post.side_effect = [response_without_next_token]

    self.assertEqual(
        v2node(['dc/1', 'dc/2'], '->{property1,property2}', max_pages=3),
        response_without_next_token)

  @mock.patch('server.services.datacommons.post')
  def test_merging_paged_responses(self, mock_post):
    response_with_next_token = get_json('v2node_response_with_next_token')
    response_without_next_token = get_json('v2node_response_without_next_token')
    mock_post.side_effect = [
        response_with_next_token, response_without_next_token
    ]

    self.assertEqual(
        v2node(['dc/1', 'dc/2'], '->{property1,property2}', max_pages=3),
        get_json('v2node_expected_merged_response'))

  @mock.patch('server.services.datacommons.post')
  def test_merging_property_responses(self, mock_post):
    properties_with_next_token = get_json('v2node_properties_with_next_token')
    properties_without_next_token = get_json(
        'v2node_properties_without_next_token')
    mock_post.side_effect = [
        properties_with_next_token, properties_without_next_token
    ]

    self.assertEqual(v2node(['dc/1', 'dc/2'], '->', max_pages=3),
                     get_json('v2node_expected_merged_properties'))

  @mock.patch('server.services.datacommons.post')
  def test_empty_response_returns_empty(self, mock_post):
    mock_post.side_effect = [{}]

    self.assertEqual(v2node(['dc/1', 'dc/2'], '->', max_pages=3), {})

  @mock.patch('server.services.datacommons.post')
  def test_no_data_in_response(self, mock_post):
    response_with_no_data = {'data': {'dc/1': {}, 'dc/2': {}}}
    mock_post.side_effect = [response_with_no_data]

    self.assertEqual(v2node(['dc/1', 'dc/2'], '->', max_pages=3),
                     response_with_no_data)
