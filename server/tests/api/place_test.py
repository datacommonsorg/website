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
                'in': [{
                    'dcid': 'dcid1',
                    'name': 'name1',
                    'types': ['County', 'AdministrativeArea'],
                }, {
                    'dcid': 'dcid2',
                    'name': 'name2',
                    'types': ['County'],
                }, {
                    'dcid': 'dcid3',
                    'name': 'name3',
                    'types': ['State'],
                }, {
                    'dcid': 'dcid4',
                    'name': 'name4',
                    'types': ['CensusTract'],
                }]
            }
        }
        mock_fetch_data.side_effect = (
            lambda url, req, compress, post: mock_response)

        mock_get_stats.return_value = json.dumps({
            'dcid1': {
                'data': {
                    '2018': 200
                }
            },
            'dcid2': {
                'data': {
                    '2018': 300
                }
            },
            'dcid3': {
                'data': {
                    '2018': 100
                }
            },
            'dcid4': {
                'data': {
                    '2018': 500
                }
            },
        })

        response = app.test_client().get('/api/place/child/geoId/06')
        assert response.status_code == 200
        assert json.loads(response.data) == {
            'County': [{
                'dcid': 'dcid2',
                'name': 'name2',
                'pop': 300
            }, {
                'dcid': 'dcid1',
                'name': 'name1',
                'pop': 200
            }],
            'State': [{
                'dcid': 'dcid3',
                'name': 'name3',
                'pop': 100
            }]
        }


class TestApiParentPlaces(unittest.TestCase):

    @staticmethod
    def side_effect(url, req, compress, post):
        if 'geoId/0649670' == req['dcids'][0]:
            return {
                'geoId/0649670': {
                    'out': [{
                        'dcid': 'geoId/06085',
                        'name': 'Santa Clara County',
                        'provenanceId': 'dc/sm3m2w3',
                        'types': ['AdministrativeArea', 'County']
                    }, {
                        'dcid': 'geoId/06',
                        'name': 'California',
                        'provenanceId': 'dc/sm3m2w3',
                        'types': ['AdministrativeArea', 'State']
                    }]
                }
            }
        elif 'geoId/06' == req['dcids'][0]:
            return {
                'geoId/06': {
                    'out': [{
                        'dcid': 'country/USA',
                        'name': 'United States',
                        'provenanceId': 'dc/sm3m2w3',
                        'types': ['Country']
                    }]
                }
            }
        else:
            return {req['dcids'][0]: {}}

    @patch('routes.api.place.fetch_data')
    def test_parent_places(self, mock_fetch_data):
        mock_fetch_data.side_effect = self.side_effect
        response = app.test_client().get('/api/place/parent/geoId/0649670')
        assert response.status_code == 200
        assert json.loads(response.data) == [{
            'dcid': 'geoId/06085',
            'name': 'Santa Clara County',
            'provenanceId': 'dc/sm3m2w3',
            'types': ['County']
        }, {
            'dcid': 'geoId/06',
            'name': 'California',
            'provenanceId': 'dc/sm3m2w3',
            'types': ['State']
        }, {
            'dcid': 'country/USA',
            'name': 'United States',
            'provenanceId': 'dc/sm3m2w3',
            'types': ['Country']
        }]


class TestApiPlaceName(unittest.TestCase):

    @patch('routes.api.place.fetch_data')
    def test_parent_places(self, mock_fetch_data):
        mock_response = {
            'geoId/06': {
                'out': [{
                    'value': 'California',
                    'provenance': 'prov1'
                }]
            },
            'geoId/07': {
                'out': []
            },
            'geoId/08': {
                'out': [{
                    'value': 'Colorado',
                    'provenance': 'prov2'
                }]
            }
        }
        mock_fetch_data.side_effect = (
            lambda url, req, compress, post: mock_response)

        response = app.test_client().get(
            '/api/place/name?dcid=geoId/06&dcid=geoId/07&dcid=geoId/08')
        assert response.status_code == 200
        assert json.loads(response.data) == {
            'geoId/06': 'California',
            'geoId/07': '',
            'geoId/08': 'Colorado'
        }
