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
from services import datacommons as dc


class TestRoute(unittest.TestCase):

    @staticmethod
    def side_effect(url, req, compress, post):
        if 'containedInPlace' == req['property']:
            return {
                'geoId/06': {
                    'in': [{
                        'dcid': 'dcid1',
                        'name': 'name1',
                        'types': ['County', 'AdministrativeArea2'],
                    }, {
                        'dcid': 'dcid2',
                        'name': 'name2',
                        'types': ['County'],
                    }, {
                        'dcid': 'dcid4',
                        'name': 'name4',
                        'types': ['CensusTract'],
                    }]
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

        response = app.test_client().get('/api/place/parent/Earth')
        assert response.status_code == 200
        assert json.loads(response.data) == []


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


class TestApiDisplayName(unittest.TestCase):

    @patch('routes.api.place.dc.get_property_values')
    @patch('routes.api.place.fetch_data')
    def test_api_display_name(self, mock_data_fetcher, mock_iso_codes):
        dcid1 = 'dcid1'
        dcid2 = 'dcid2'
        dcid3 = 'dcid3'
        us_state_parent = 'parent1'
        us_country_parent = 'parent2'
        cad_state_parent = 'parent3'

        def side_effect(url, req, compress, post):
            if 'containedInPlace' == req['property']:
                return {
                    dcid1: {
                        'out': [
                            {
                                'dcid': us_state_parent,
                                'name': us_state_parent,
                                'types': ['State'],
                            },
                            {
                                'dcid': us_country_parent,
                                'name': us_country_parent,
                                'types': ['Country'],
                            },
                        ]
                    },
                    dcid2: {
                        'out': [{
                            'dcid': us_country_parent,
                            'name': us_country_parent,
                            'types': ['Country'],
                        },]
                    },
                    dcid3: {
                        'out': [{
                            'dcid': cad_state_parent,
                            'name': cad_state_parent,
                            'types': ['State'],
                        },]
                    },
                    cad_state_parent: {
                        'out': []
                    },
                    us_state_parent: {
                        'out': []
                    },
                    us_country_parent: {
                        'out': []
                    }
                }
            elif 'name' == req['property']:
                return {
                    dcid1: {
                        'out': [{
                            'value': dcid1
                        }]
                    },
                    dcid2: {
                        'out': [{
                            'value': dcid2
                        }]
                    },
                    dcid3: {
                        'out': [{
                            'value': dcid3
                        }]
                    },
                }
            else:
                return {req['dcids'][0]: {}}

        mock_data_fetcher.side_effect = side_effect
        mock_iso_codes.return_value = {
            us_state_parent: ['US-CA'],
            cad_state_parent: ['CA-BC']
        }
        response = app.test_client().get(
            '/api/place/displayname?dcid=dcid1&dcid=dcid2&dcid=dcid3')
        assert response.status_code == 200
        assert json.loads(response.data) == {
            dcid1: dcid1 + ', CA',
            dcid2: dcid2,
            dcid3: dcid3
        }


class TestApiGetPlacesIn(unittest.TestCase):

    @patch('services.datacommons.send_request')
    def test_api_get_places_in(self, send_request):

        def side_effect(req_url,
                        req_json={},
                        compress=False,
                        post=True,
                        has_payload=True):
            if req_url == dc.API_ROOT + "/node/places-in" and req_json == {
                    'dcids': ['geoId/10', 'geoId/56'],
                    'place_type': 'County'
            } and not post:
                return [{
                    "dcid": "geoId/10",
                    "place": "geoId/10001"
                }, {
                    "dcid": "geoId/10",
                    "place": "geoId/10003"
                }, {
                    "dcid": "geoId/10",
                    "place": "geoId/10005"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56001"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56003"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56005"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56007"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56009"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56011"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56013"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56015"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56017"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56019"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56021"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56023"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56025"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56027"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56029"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56031"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56033"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56035"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56037"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56039"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56041"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56043"
                }, {
                    "dcid": "geoId/56",
                    "place": "geoId/56045"
                }]

        send_request.side_effect = side_effect
        response = app.test_client().get(
            '/api/place/places-in?dcid=geoId/10&dcid=geoId/56&placeType=County')
        assert response.status_code == 200
        assert json.loads(response.data) == {
            "geoId/10": ["geoId/10001", "geoId/10003", "geoId/10005"],
            "geoId/56": [
                "geoId/56001", "geoId/56003", "geoId/56005", "geoId/56007",
                "geoId/56009", "geoId/56011", "geoId/56013", "geoId/56015",
                "geoId/56017", "geoId/56019", "geoId/56021", "geoId/56023",
                "geoId/56025", "geoId/56027", "geoId/56029", "geoId/56031",
                "geoId/56033", "geoId/56035", "geoId/56037", "geoId/56039",
                "geoId/56041", "geoId/56043", "geoId/56045"
            ]
        }


class TestApiGetPlacesInNames(unittest.TestCase):

    @patch('services.datacommons.send_request')
    def test_api_get_places_in_names(self, send_request):

        def side_effect(req_url,
                        req_json={},
                        compress=False,
                        post=True,
                        has_payload=True):
            if req_url == dc.API_ROOT + "/node/places-in" and req_json == {
                    'dcids': ['geoId/10'],
                    'place_type': 'County'
            } and not post:
                return [{
                    "dcid": "geoId/10",
                    "place": "geoId/10001"
                }, {
                    "dcid": "geoId/10",
                    "place": "geoId/10003"
                }, {
                    "dcid": "geoId/10",
                    "place": "geoId/10005"
                }]
            elif req_url == dc.API_ROOT + "/node/property-values" and req_json == {
                    'dcids': ["geoId/10001", "geoId/10003", "geoId/10005"],
                    'property': 'name',
                    'direction': 'out'
            } and post:
                return {
                    "geoId/10001": {
                        'out': [{
                            'value': "Kent County"
                        }]
                    },
                    "geoId/10003": {
                        'out': [{
                            'value': "New Castle County"
                        }]
                    },
                    "geoId/10005": {
                        'out': [{
                            'value': "Sussex County"
                        }]
                    },
                }

        send_request.side_effect = side_effect
        response = app.test_client().get(
            '/api/place/places-in-names?dcid=geoId/10&placeType=County')
        assert response.status_code == 200
        assert json.loads(response.data) == {
            "geoId/10001": "Kent County",
            "geoId/10003": "New Castle County",
            "geoId/10005": "Sussex County",
        }


class TestApiGetStatVarsUnion(unittest.TestCase):

    @patch('services.datacommons.send_request')
    def test_api_get_stat_vars_union(self, send_request):
        req = {'dcids': ['geoId/10001', 'geoId/10003', 'geoId/10005']}
        result = ["sv1", "sv2", "sv3"]

        def side_effect(req_url,
                        req_json={},
                        compress=False,
                        post=True,
                        has_payload=True):
            if (req_url == dc.API_ROOT + "/place/stat-vars/union" and
                    req_json == req and post and not has_payload):
                return {'statVars': {'statVars': result}}

        send_request.side_effect = side_effect
        response = app.test_client().post('/api/place/stat-vars/union',
                                          json=req)
        assert response.status_code == 200
        assert json.loads(response.data) == result
