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


class TestApiPlaceI18nName(unittest.TestCase):

    @patch('lib.i18n.AVAILABLE_LANGUAGES',
           ['en', 'io', 'la', 'la-ru', 'it', 'ru'])
    @patch('routes.api.place.fetch_data')
    def test_parent_places(self, mock_fetch_data):
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
