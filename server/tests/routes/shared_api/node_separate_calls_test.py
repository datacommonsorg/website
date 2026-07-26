# Copyright 2026 Google LLC
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

from web_app import app


class TestNodeApiSeparateCalls(unittest.TestCase):

  @patch('server.routes.shared_api.node.is_feature_enabled')
  @patch('server.routes.shared_api.node.fetch.triples')
  def test_triples_fallback_when_flag_disabled(self, mock_triples, mock_flag):
    # Setup mocks
    mock_flag.return_value = False
    mock_triples.return_value = {'dc/g/Demographics': {'memberOf': []}}

    # Call endpoint
    response = app.test_client().get('/api/node/triples/in/dc/g/Demographics')

    # Assertions
    self.assertEqual(response.status_code, 200)
    mock_triples.assert_called_once_with(['dc/g/Demographics'], False)
    self.assertEqual(response.get_json(), {'memberOf': []})

  @patch('server.routes.shared_api.node.is_feature_enabled')
  @patch('server.routes.shared_api.node.fetch.properties')
  @patch('server.routes.shared_api.node.dc.v2node_paginated')
  def test_triples_separate_calls_when_flag_enabled(self, mock_v2node,
                                                    mock_properties, mock_flag):
    # Setup flags: enabled
    mock_flag.side_effect = lambda f: f == 'use_separate_property_value_calls'

    # Mock properties returned
    mock_properties.return_value = {
        'dc/g/Demographics': ['memberOf', 'specializationOf']
    }

    # Mock individual responses
    def v2node_side_effect(nodes, prop, max_pages):
      if 'memberOf' in prop:
        return {
            'data': {
                'dc/g/Demographics': {
                    'arcs': {
                        'memberOf': {
                            'nodes': [{
                                'dcid': 'Count_Person',
                                'name': 'Person Count'
                            }]
                        }
                    }
                }
            }
        }
      elif 'specializationOf' in prop:
        return {
            'data': {
                'dc/g/Demographics': {
                    'arcs': {
                        'specializationOf': {
                            'nodes': [{
                                'dcid': 'dc/g/Root',
                                'name': 'Root Variables'
                            }]
                        }
                    }
                }
            }
        }
      return {}

    mock_v2node.side_effect = v2node_side_effect

    # Call endpoint
    response = app.test_client().get('/api/node/triples/in/dc/g/Demographics')

    # Assertions
    self.assertEqual(response.status_code, 200)
    mock_properties.assert_called_once_with(['dc/g/Demographics'], False)
    self.assertEqual(mock_v2node.call_count, 2)
    mock_v2node.assert_any_call(['dc/g/Demographics'],
                                '<-memberOf',
                                max_pages=1)
    mock_v2node.assert_any_call(['dc/g/Demographics'],
                                '<-specializationOf',
                                max_pages=1)

    expected_response = {
        'memberOf': [{
            'dcid': 'Count_Person',
            'name': 'Person Count'
        }],
        'specializationOf': [{
            'dcid': 'dc/g/Root',
            'name': 'Root Variables'
        }]
    }
    self.assertEqual(response.get_json(), expected_response)
