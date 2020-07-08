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

import pytest
import unittest
import logging
import json
from unittest.mock import patch

from main import app

class TestStaticPage(unittest.TestCase):
    def test_homepage(self):
        response = app.test_client().get('/')
        assert response.status_code == 200
        assert b"Data Commons is a project started by Google" in response.data


class TestApiParentPlaces(unittest.TestCase):
    @staticmethod
    def side_effect(url, req_json):
        if "geoId/0649670" == req_json['dcids'][0]:
          return {
            "geoId/0649670": {
              "out":[
                {
                  "dcid":"geoId/06085",
                  "name":"Santa Clara County",
                  "provenanceId":"dc/sm3m2w3",
                  "types":["AdministrativeArea","County"]
                },
                {
                  "dcid":"geoId/06",
                  "name":"California",
                  "provenanceId":"dc/sm3m2w3",
                  "types":["AdministrativeArea","State"]
                }
              ]
            }
          }
        elif "geoId/06" == req_json['dcids'][0]:
          return {
            "geoId/06": {
              "out":[
                {
                  "dcid": "country/USA",
                  "name": "United States",
                  "provenanceId": "dc/sm3m2w3",
                  "types": ["Country"]
                }
              ]
            }
          }
        else:
          return {}

    @patch('main.dc.send_request')
    def test_api_parent_places(self, mock_send_request):
        mock_send_request.side_effect = self.side_effect
        response = app.test_client().get('/api/parent-place/geoId/0649670')
        assert response.status_code == 200
        assert json.loads(response.data) == [
          {
            "dcid": "geoId/06085",
            "name": "Santa Clara County",
            "provenanceId": "dc/sm3m2w3",
            "types": ["County"]
          },
          {
            "dcid": "geoId/06",
            "name": "California",
            "provenanceId": "dc/sm3m2w3",
            "types": ["State"]
          },
          {
            "dcid": "country/USA",
            "name": "United States",
            "provenanceId": "dc/sm3m2w3",
            "types": ["Country"]
          }
        ]