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

    @patch('routes.api.place.cached_name')
    def test_parent_places(self, mock_cached_name):
        mock_cached_name.return_value = {
            'geoId/06': 'California',
            'geoId/07': '',
            'geoId/08': 'Colorado'
        }

        response = app.test_client().get(
            '/api/place/name?dcid=geoId/06&dcid=geoId/07&dcid=geoId/08')
        assert response.status_code == 200
        assert json.loads(response.data) == {
            'geoId/06': 'California',
            'geoId/07': '',
            'geoId/08': 'Colorado'
        }


class TestApiPlaceI18nName(unittest.TestCase):

    @patch('lib.i18n.AVAILABLE_LANGUAGES',
           ['en', 'io', 'la', 'la-ru', 'it', 'ru'])
    @patch('routes.api.place.cached_name')
    @patch('routes.api.place.fetch_data')
    def test_parent_places(self, mock_fetch_data, mock_cached_name):
        mock_cached_name.return_value = {'geoId/08': 'Colorado'}
        mock_response = {
            'geoId/05': {
                'out': [{
                    'value': 'ArkansasEn@en',
                    'provenance': 'prov1'
                }, {
                    'value': 'ArkansasIO@io',
                    'provenance': 'prov1'
                }, {
                    'value': 'ArkansasLA-RU@la-ru',
                    'provenance': 'prov1'
                }]
            },
            'geoId/06': {
                'out': [{
                    'value': 'CaliforniaIT@it',
                    'provenance': 'prov2'
                }, {
                    'value': 'CaliforniaLA@la',
                    'provenance': 'prov2'
                }, {
                    'value': 'CaliforniaEN@en',
                    'provenance': 'prov2'
                }]
            }
        }
        mock_fetch_data.side_effect = (
            lambda url, req, compress, post: mock_response)

        # There is no hl parameter, use default en.
        response = app.test_client().get(
            '/api/place/name/i18n?dcid=geoId/05&dcid=geoId/06')
        assert response.status_code == 200
        assert json.loads(response.data) == {
            'geoId/05': 'ArkansasEn',
            'geoId/06': 'CaliforniaEN'
        }

        mock_fetch_data.side_effect = (
            lambda url, req, compress, post: mock_response)

        # Arkansas doesn't have name in @it, fall back to @en instead.
        response = app.test_client().get(
            '/api/place/name/i18n?dcid=geoId/05&dcid=geoId/06&hl=it')
        assert response.status_code == 200
        assert json.loads(response.data) == {
            'geoId/05': 'ArkansasEn',
            'geoId/06': 'CaliforniaIT'
        }

        # Lower case language code.
        response = app.test_client().get(
            '/api/place/name/i18n?dcid=geoId/05&dcid=geoId/06&hl=LA')
        assert response.status_code == 200
        assert json.loads(response.data) == {
            'geoId/05': 'ArkansasEn',
            'geoId/06': 'CaliforniaLA'
        }

        # Verify language code parsing correct, not using la-ru.
        response = app.test_client().get(
            '/api/place/name/i18n?dcid=geoId/05&hl=ru')
        assert response.status_code == 200
        assert json.loads(response.data) == {'geoId/05': 'ArkansasEn'}

        # Verify fall back to the first part of locale, la-ru to la.
        response = app.test_client().get(
            '/api/place/name/i18n?dcid=geoId/05&dcid=geoId/06&hl=la-ru')
        assert response.status_code == 200
        assert json.loads(response.data) == {
            'geoId/05': 'ArkansasLA-RU',
            'geoId/06': 'CaliforniaLA'
        }

        # Verify when there is no nameWithLanguage, fall back to name
        def side_effect(url, req, compress, post):
            if 'name' == req['property']:
                return {
                    'geoId/08': {
                        'out': [{
                            'value': 'Colorado',
                            'provenance': 'prov2'
                        }]
                    }
                }
            elif 'nameWithLanguage' == req['property']:
                return {"geoId/08": {}}
            else:
                return {req['dcids'][0]: {}}

        mock_fetch_data.side_effect = side_effect
        response = app.test_client().get('/api/place/name/i18n?dcid=geoId/08')
        assert response.status_code == 200
        assert json.loads(response.data) == {
            'geoId/08': 'Colorado',
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
        dcid1_en = 'dcid1@en'
        dcid2_en = 'dcid2@en'
        dcid3_en = 'dcid3@en'

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
            elif 'nameWithLanguage' == req['property']:
                return {
                    dcid1: {
                        'out': [{
                            'value': dcid1_en
                        }]
                    },
                    dcid2: {
                        'out': [{
                            'value': dcid2_en
                        }]
                    },
                    dcid3: {
                        'out': [{
                            'value': dcid3_en
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

    @patch('routes.api.place.cached_i18n_name')
    @patch('routes.api.place.parent_places')
    def test_i18n_api_display_name(self, mock_parent_places,
                                   mock_cached_i18n_name):

        def side_effect(dcids, locale, should_resolve_all):
            if locale != 'fr':
                return {}
            if dcids == 'geoId/0665042^nuts/UKG3^wikidataId/Q21':
                return {
                    'geoId/0665042': 'San Buenaventura (Ventura)',
                    'nuts/UKG3': 'Midlands de l\'Ouest',
                    'wikidataId/Q21': 'Angleterre',
                }
            if dcids == 'geoId/06^wikidataId/Q21':
                return {
                    'geoId/06': 'Californie',
                    'wikidataId/Q21': 'Angleterre',
                }

        mock_parent_places.return_value = {
            'geoId/0665042': [{
                'dcid': 'geoId/06111',
                'name': 'Ventura County',
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
                'provenanceId': 'dc/5n63hr1',
                'types': ['Country']
            }],
            'nuts/UKG3': [{
                'dcid': 'nuts/UKG',
                'name': 'West Midlands',
                'provenanceId': 'dc/5j06ly1',
                'types': ['EurostatNUTS1']
            }, {
                'dcid': 'wikidataId/Q21',
                'name': 'England',
                'provenanceId': 'dc/5j06ly1',
                'types': ['AdministrativeArea1']
            }, {
                'dcid': 'country/GBR',
                'name': 'United Kingdom',
                'provenanceId': 'dc/5j06ly1',
                'types': ['Country']
            }],
            'wikidataId/Q21': [{
                'dcid': 'country/GBR',
                'name': 'United Kingdom',
                'provenanceId': 'dc/5n63hr1',
                'types': ['Country']
            }]
        }

        mock_cached_i18n_name.side_effect = side_effect

        response = app.test_client().get(
            '/api/place/displayname?hl=fr&dcid=geoId/0665042&dcid=nuts/UKG3&dcid=wikidataId/Q21'
        )
        assert response.status_code == 200
        assert json.loads(response.data) == {
            'geoId/0665042': 'San Buenaventura (Ventura), Californie',
            'nuts/UKG3': 'Midlands de l\'Ouest, Angleterre',
            'wikidataId/Q21': 'Angleterre',
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

    @patch('routes.api.place.get_display_name')
    @patch('services.datacommons.send_request')
    def test_api_get_places_in_names(self, send_request, display_name):

        def send_request_side_effect(req_url,
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

        def display_name_side_effect(dcids):
            if dcids == "geoId/10001^geoId/10003^geoId/10005":
                return {
                    "geoId/10001": "Kent County, DE",
                    "geoId/10003": "New Castle County, DE",
                    "geoId/10005": "Sussex County, DE",
                }

        send_request.side_effect = send_request_side_effect
        display_name.side_effect = display_name_side_effect
        response = app.test_client().get(
            '/api/place/places-in-names?dcid=geoId/10&placeType=County')
        assert response.status_code == 200
        assert json.loads(response.data) == {
            "geoId/10001": "Kent County, DE",
            "geoId/10003": "New Castle County, DE",
            "geoId/10005": "Sussex County, DE",
        }


class TestApiGetStatVarsUnion(unittest.TestCase):

    @patch('services.datacommons.send_request')
    def test_api_get_stat_vars_union(self, send_request):
        req = {
            'dcids': ['geoId/10001', 'geoId/10003', 'geoId/10005'],
            'statVars': []
        }
        req2 = {'dcids': ['geoId/10002'], 'statVars': []}
        result = ["sv1", "sv2", "sv3"]

        def side_effect(req_url,
                        req_json={},
                        compress=False,
                        post=True,
                        has_payload=True):
            if (req_url == dc.API_ROOT + "/v1/place/stat-vars/union" and
                    req_json == req and post and not has_payload):
                return {'statVars': result}
            if (req_url == dc.API_ROOT + "/v1/place/stat-vars/union" and
                    req_json == req2 and post and not has_payload):
                return {}

        send_request.side_effect = side_effect
        response = app.test_client().post('/api/place/stat-vars/union',
                                          json=req)
        assert response.status_code == 200
        assert json.loads(response.data) == result
        empty_response = app.test_client().post('/api/place/stat-vars/union',
                                                json=req2)
        assert empty_response.status_code == 200
        assert json.loads(empty_response.data) == []
