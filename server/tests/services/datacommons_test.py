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
from server.services.datacommons import v2node_paginated

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
  def test_v2node_returns_response(self, mock_post):
    response_with_next_token = get_json('v2node_response_with_next_token')

    def side_effect(url, data):
      assert url.endswith('/v2/node')
      assert data == {
          'nodes': ['dc/1', 'dc/2'],
          'property': '->{property1,property2}',
      }
      return response_with_next_token

    mock_post.side_effect = side_effect

    self.assertEqual(v2node(['dc/1', 'dc/2'], '->{property1,property2}'),
                     response_with_next_token)
    assert mock_post.call_count == 1

  @mock.patch('server.services.datacommons.post')
  def test_large_input_size_makes_multiple_post_calls(self, mock_post):

    input_dcids = [f'dc{i}' for i in range(10000)]
    v2node(input_dcids, '->*')
    assert mock_post.call_count == 19
    print(mock_post.call_args)
    print('hello worlds')
    assert mock_post.call_args.args[1]['nodes'] == input_dcids[9734:]
    assert len(mock_post.call_args.args[1]['nodes']) < len(input_dcids)


class TestServiceDataCommonsV2NodePaginated(unittest.TestCase):

  @mock.patch('server.services.datacommons.post')
  def test_termination_condition_max_pages_fetched(self, mock_post):
    response_with_next_token = get_json('v2node_response_with_next_token')

    def side_effect(url, data):
      assert url.endswith('/v2/node')
      assert data == {
          'nodes': ['dc/1', 'dc/2'],
          'property': '->{property1,property2}',
          'nextToken': ''
      }
      return response_with_next_token

    mock_post.side_effect = side_effect

    self.assertEqual(
        v2node_paginated(['dc/1', 'dc/2'],
                         '->{property1,property2}',
                         max_pages=1), response_with_next_token)
    assert mock_post.call_count == 1

  @mock.patch('server.services.datacommons.post')
  def test_termination_condition_no_next_token(self, mock_post):
    response_without_next_token = get_json('v2node_response_without_next_token')

    def side_effect(url, data):
      assert url.endswith('/v2/node')
      assert data == {
          'nodes': ['dc/1', 'dc/2'],
          'property': '->{property1,property2}',
          'nextToken': ''
      }
      return response_without_next_token

    mock_post.side_effect = side_effect

    self.assertEqual(
        v2node_paginated(['dc/1', 'dc/2'],
                         '->{property1,property2}',
                         max_pages=3), response_without_next_token)
    assert mock_post.call_count == 1

  @mock.patch('server.services.datacommons.post')
  def test_merge_paged_responses_with_no_max_pages(self, mock_post):
    response_with_next_token = get_json('v2node_response_with_next_token')
    response_without_next_token = get_json('v2node_response_without_next_token')

    call_count = 0

    def side_effect(url, data):
      nonlocal call_count
      call_count += 1
      assert url.endswith('/v2/node')
      assert data['nodes'] == ['dc/1', 'dc/2']
      assert data['property'] == '->{property1,property2}'

      if call_count == 1:
        assert not data['nextToken']
        return response_with_next_token

      assert data['nextToken']
      return response_without_next_token

    mock_post.side_effect = side_effect

    self.assertEqual(
        v2node_paginated(['dc/1', 'dc/2'],
                         '->{property1,property2}',
                         max_pages=None),
        get_json('v2node_expected_merged_response'))
    assert mock_post.call_count == 2

  @mock.patch('server.services.datacommons.post')
  def test_merging_property_responses(self, mock_post):
    properties_with_next_token = get_json('v2node_properties_with_next_token')
    properties_without_next_token = get_json(
        'v2node_properties_without_next_token')
    call_count = 0

    def side_effect(url, data):
      nonlocal call_count
      call_count += 1
      assert url.endswith('/v2/node')
      assert data['nodes'] == ['dc/1', 'dc/2']
      assert data['property'] == '->'

      if call_count == 1:
        assert not data['nextToken']
        return properties_with_next_token

      assert data['nextToken']
      return properties_without_next_token

    mock_post.side_effect = side_effect

    self.assertEqual(v2node_paginated(['dc/1', 'dc/2'], '->', max_pages=3),
                     get_json('v2node_expected_merged_properties'))
    assert mock_post.call_count == 2

  @mock.patch('server.services.datacommons.post')
  def test_empty_response_returns_empty(self, mock_post):

    def side_effect(url, data):
      assert url.endswith('/v2/node')
      assert data == {
          'nodes': ['dc/1', 'dc/2'],
          'property': '->',
          'nextToken': ''
      }
      return {}

    mock_post.side_effect = side_effect

    self.assertEqual(v2node_paginated(['dc/1', 'dc/2'], '->', max_pages=3), {})
    assert mock_post.call_count == 1

  @mock.patch('server.services.datacommons.post')
  def test_no_data_in_response(self, mock_post):
    response_with_no_data_for_dcids = {'data': {'dc/1': {}, 'dc/2': {}}}

    def side_effect(url, data):
      assert url.endswith('/v2/node')
      assert data == {
          'nodes': ['dc/1', 'dc/2'],
          'property': '->',
          'nextToken': ''
      }
      return response_with_no_data_for_dcids

    mock_post.side_effect = side_effect

    self.assertEqual(v2node_paginated(['dc/1', 'dc/2'], '->', max_pages=3),
                     response_with_no_data_for_dcids)
    assert mock_post.call_count == 1

  @mock.patch('server.services.datacommons.post')
  def test_large_input_size_makes_multiple_post_calls(self, mock_post):

    input_dcids = [f'dc{i}' for i in range(10000)]
    v2node_paginated(input_dcids, '->*')
    assert mock_post.call_count == 19
    assert mock_post.call_args.args[1]['nodes'] == input_dcids[9734:]
    assert len(mock_post.call_args.args[1]['nodes']) < len(input_dcids)
