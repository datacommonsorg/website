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
    @staticmethod
    def side_effect(url, req, compress, post):
        print(req)
        if 'containedInPlace' == req['property']:
            return {
                'geoId/06': {
                    'in': [
                        {
                            'dcid': 'dcid1',
                            'name': 'name1',
                            'types': ['County', 'AdministrativeArea2'],
                        },
                        {
                            'dcid': 'dcid2',
                            'name': 'name2',
                            'types': ['County'],
                        },
                        {
                            'dcid': 'dcid4',
                            'name': 'name4',
                            'types': ['CensusTract'],
                        }
                    ]
                }
            }
        elif 'geoOverlaps' == req['property']:
            return {
                'geoId/06': {
                    'in': [
                        {
                            'dcid': 'dcid3',
                            'name': 'name3',
                            'types': ['State'],
                        },
                        {
                            'dcid': 'dcid5',
                            'name': 'name5',
                            'types': ['AdministrativeArea2'],
                        },
                    ]
                }
            }
        else:
            return {req['dcids'][0]: {}}

    @patch('routes.api.place.dc.get_property_values')
    @patch('routes.api.place.fetch_data')
    @patch('routes.api.place.stats_api.get_stats_wrapper')
    def test_index(self, mock_get_stats, mock_fetch_data, mock_get_place_type):
        mock_fetch_data.side_effect = self.side_effect

        mock_get_stats.return_value = json.dumps({
            'dcid1': {'data': {'2018': 200}},
            'dcid2': {'data': {'2018': 300}},
            'dcid3': {'data': {'2018': 100}},
            'dcid4': {'data': {'2018': 500}},
        })

        mock_get_place_type.return_value = {
            'geoId/06': ['State']
        }

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
            ]
        }


class TestApiParentPlaces(unittest.TestCase):
    @staticmethod
    def side_effect(url, req, compress, post):
        if 'geoId/0649670' == req['dcids'][0]:
            return {
                'geoId/0649670': {
                    'out': [
                        {
                            'dcid': 'geoId/06085',
                            'name': 'Santa Clara County',
                            'provenanceId': 'dc/sm3m2w3',
                            'types': ['AdministrativeArea', 'County']
                        },
                        {
                            'dcid': 'geoId/06',
                            'name': 'California',
                            'provenanceId': 'dc/sm3m2w3',
                            'types': ['AdministrativeArea', 'State']
                        }
                    ]
                }
            }
        elif 'geoId/06' == req['dcids'][0]:
            return {
                'geoId/06': {
                    'out': [
                        {
                            'dcid': 'country/USA',
                            'name': 'United States',
                            'provenanceId': 'dc/sm3m2w3',
                            'types': ['Country']
                        }
                    ]
                }
            }
        else:
            return {req['dcids'][0]: {}}

    @patch('routes.api.place.fetch_data')
    def test_parent_places(self, mock_fetch_data):
        mock_fetch_data.side_effect = self.side_effect
        response = app.test_client().get('/api/place/parent/geoId/0649670')
        assert response.status_code == 200
        assert json.loads(response.data) == [
            {
                'dcid': 'geoId/06085',
                'name': 'Santa Clara County',
                'provenanceId': 'dc/sm3m2w3',
                'types': ['County']
            },
            {
                'dcid': 'geoId/06',
                'name': 'California',
                'provenanceId': 'dc/sm3m2w3',
                'types': ['State']
            },
            {
                'dcid': 'country/USA',
                'name': 'United States',
                'provenanceId': 'dc/sm3m2w3',
                'types': ['Country']
            }
        ]


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
            'geoId/06': 'California', 'geoId/07': '', 'geoId/08': 'Colorado'}


class TestApiDisplayName(unittest.TestCase):
    @patch('routes.api.place.get_property_value')
    @patch('routes.api.place.parent_places')
    @patch('routes.api.place.cached_name')
    def test_api_display_name(self, mock_cached_name, mock_parent_places, mock_iso_code):
        dcid1 = 'dcid1'
        dcid2 = 'dcid2'
        dcid3 = 'dcid3'
        us_state_parent = 'parent1'
        us_country_parent = 'parent2'
        cad_state_parent = 'parent3'
        cached_name_mapping = {
            dcid1: dcid1,
            dcid2: dcid2,
            dcid3: dcid3
        }
        mock_cached_name.return_value = cached_name_mapping
        dcid1_parent_places = json.dumps([
            {'dcid': us_state_parent, 'name': us_state_parent, 'provenanceId': us_state_parent, 'types': ['State']},
            {'dcid': us_country_parent, 'name': us_country_parent, 'provenanceId': us_country_parent, 'types': ['Country']},

        ])
        dcid2_parent_places = json.dumps([
            {'dcid': us_country_parent, 'name': us_country_parent, 'provenanceId': us_country_parent, 'types': ['Country']},

        ])
        dcid3_parent_places = json.dumps([
            {'dcid': cad_state_parent, 'name': cad_state_parent, 'provenanceId': cad_state_parent, 'types': ['State']},
        ])
        parent_places_mapping = {
            dcid1: dcid1_parent_places,
            dcid2: dcid2_parent_places,
            dcid3: dcid3_parent_places
        }
        mock_parent_places.side_effect = parent_places_mapping.get
        iso_code_mapping = {
            us_state_parent: ['US-CA'],
            cad_state_parent: ['CA-BC']
        }
        mock_iso_code.side_effect = iso_code_mapping.get

        response = app.test_client().get(
            '/api/place/displayname?dcid=dcid1&dcid=dcid2&dcid=dcid3')
        assert response.status_code == 200
        assert json.loads(response.data) == {
            dcid1: dcid1 + ', CA',
            dcid2: dcid2,
            dcid3: dcid3
        }
