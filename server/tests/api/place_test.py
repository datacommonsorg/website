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

import json
import unittest
from unittest.mock import patch

from main import app


class TestRoute(unittest.TestCase):
    @patch('routes.api.place.fetch_data')
    @patch('routes.api.place.get_stats_wrapper')
    def test_index(self, mock_get_stats, mock_fetch_data):
        mock_response = {
          'geoId/06': {
            'in': [
              {
                'dcid': 'dcid1',
                'name': 'name1',
                'types': ['County', 'AdministrativeArea'],
              },
              {
                'dcid': 'dcid2',
                'name': 'name2',
                'types': ['County'],
              },
              {
                'dcid': 'dcid3',
                'name': 'name3',
                'types': ['State'],
              },
              {
                'dcid': 'dcid4',
                'name': 'name4',
                'types': ['CensusTract'],
              }
            ]
          }
        }
        mock_fetch_data.side_effect = (
          lambda url, req, compress, post: mock_response)

        mock_get_stats.return_value = json.dumps({
          'dcid1': {'data': {'2018': 200}},
          'dcid2': {'data': {'2018': 300}},
          'dcid3': {'data': {'2018': 100}},
          'dcid4': {'data': {'2018': 500}},
        })

        response = app.test_client().get('/api/place/child/geoId/06')
        assert response.status_code == 200
        assert json.loads(response.data) == {
          'County': [
            {
              'dcid': 'dcid2',
              'name': 'name2',
              'pop': 300
            },
            {
              'dcid': 'dcid1',
              'name': 'name1',
              'pop': 200
            }
          ],
          'State': [
            {
              'dcid': 'dcid3',
              'name': 'name3',
              'pop': 100
            }
          ]
        }
