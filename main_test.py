import pytest
import unittest
import logging
import json
from unittest.mock import patch

from main import app
from datacommons import send_request


class TestStaticPage(unittest.TestCase):
    def test_homepage(self):
        response = app.test_client().get('/')
        assert response.status_code == 200
        assert b"The Data Commons Graph (DCG)" in response.data


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

    @patch('datacommons.send_request')
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