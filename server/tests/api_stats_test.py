import json
import unittest
from unittest import mock

from main import app
from services import datacommons as dc


class TestApiGetStatsValue(unittest.TestCase):

    @mock.patch('services.datacommons.send_request')
    def test_api_get_stats_value(self, send_request):

        def side_effect(req_url,
                        req_json={},
                        compress=False,
                        post=True,
                        has_payload=True):
            if req_url == dc.API_ROOT + "/stat/value" and req_json == {
                    'place': 'geoId/06',
                    'stat_var': 'Count_Person_Male',
                    'date': None,
                    'measurement_method': None,
                    'observation_period': None,
                    'unit': None,
                    'scaling_factor': None
            } and not post and not has_payload:
                return {'value': 19640794}

        send_request.side_effect = side_effect
        response = app.test_client().get(
            '/api/stats/value?place=geoId/06&stat_var=Count_Person_Male')
        assert response.status_code == 200
        assert json.loads(response.data) == {"value": 19640794}


class TestApiGetStatsCollection(unittest.TestCase):

    @mock.patch('services.datacommons.send_request')
    def test_api_get_stats_collection(self, send_request):

        result = {
            "data": {
                "Count_Person_Male": {
                    "val": {
                        "geoId/10001": 84271,
                        "geoId/10003": 268870,
                        "geoId/10005": 106429
                    },
                    "measurementMethod": "CensusACS5yrSurvey",
                    "importName": "CensusACS5YearSurvey",
                    "provenanceUrl": "https://www.census.gov/"
                },
                "Count_Person": {
                    "val": {
                        "geoId/10001": 178540,
                        "geoId/10003": 557550,
                        "geoId/10005": 229389
                    },
                    "measurementMethod":
                        "CensusPEPSurvey",
                    "importName":
                        "CensusPEP",
                    "provenanceUrl":
                        "https://www.census.gov/programs-surveys/popest.html"
                }
            }
        }

        def side_effect(req_url,
                        req_json={},
                        compress=False,
                        post=True,
                        has_payload=True):
            if req_url == dc.API_ROOT + "/stat/collection" and req_json == {
                    'parent_place': 'geoId/10',
                    'child_type': 'County',
                    'date': '2018',
                    'stat_vars': ['Count_Person', 'Count_Person_Male']
            } and not post and not has_payload:
                return result

        send_request.side_effect = side_effect
        response = app.test_client().get(
            '/api/stats/collection?parent_place=geoId/10&child_type=County'
            '&date=2018&stat_vars=Count_Person&stat_vars=Count_Person_Male')
        assert response.status_code == 200
        assert json.loads(response.data) == result['data']
