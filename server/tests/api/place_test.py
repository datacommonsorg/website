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
    def test_index(self, mock_fetch_data):
        mock_response = {
          'geoId/06': {
            'in': [
              {
                'dcid': 'dcid1',
                'name': 'name1',
              },
              {
                'dcid': 'dcid2',
                'name': 'name2',
              }
            ]
          }
        }
        mock_fetch_data.side_effect = (
          lambda url, req, compress, post: mock_response)
        response = app.test_client().get('/api/place/child/geoId/06')
        assert response.status_code == 200
        assert json.loads(response.data) == [
              {
                'dcid': 'dcid1',
                'name': 'name1',
              },
              {
                'dcid': 'dcid2',
                'name': 'name2',
              }
            ]
