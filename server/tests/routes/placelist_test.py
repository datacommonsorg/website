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

from web_app import app


class TestRoute(unittest.TestCase):

  @patch('server.routes.placelist.fetch_data')
  def test_index(self, mock_fetch_data):
    mock_response = {
        'Country': {
            'in': [{
                'dcid': 'country/USA',
                'name': 'United States',
            }, {
                'dcid': 'country/test',
                'name': 'test country',
            }]
        }
    }
    mock_fetch_data.side_effect = (
        lambda url, req, compress, post: mock_response)
    response = app.test_client().get('/placelist')
    assert response.status_code == 200
    assert b'United States' in response.data

  @patch('server.routes.placelist.child_fetch')
  def test_node(self, mock_child_fetch):
    mock_response = {
        'County': [{
            'dcid': 'geoId/12345',
            'name': 'county 1',
        }, {
            'dcid': 'geoId/12222',
            'name': 'county 2',
        }],
        'City': [{
            'dcid': 'geoId/6666666',
            'name': 'city 1',
        }]
    }
    mock_child_fetch.return_value = mock_response

    response = app.test_client().get('/placelist/geoId/06')
    self.assertTrue(mock_child_fetch.assert_called_once)
    assert response.status_code == 200
    assert b'county 1' in response.data
    assert b'county 2' in response.data
    assert b'city 1' in response.data

    # Test the child_fetch() cache
    response = app.test_client().get('/placelist/geoId/06')
    self.assertTrue(mock_child_fetch.assert_called_once)

  @patch('server.routes.placelist.child_fetch')
  def test_no_child(self, mock_child_fetch):
    mock_child_fetch.return_value = {}
    response = app.test_client().get('/placelist/geoId/07')
    assert response.status_code == 200
    assert b'There are no sub-places in our knowledge' in response.data
