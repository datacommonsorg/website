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


class TestObservationIdsMap(unittest.TestCase):

    def test_required_predicates(self):
        """Failure if required fields are not present."""
        no_stat_var = app.test_client().get(
            '/api/browser/observation-ids-map?place=country/USA')
        assert no_stat_var.status_code == 400

        no_place = app.test_client().get(
            '/api/browser/observation-ids-map?statVar=testStatVar')
        assert no_place.status_code == 400

    @patch('routes.api.browser.dc.query')
    def test_observation_node_dcid_returned(self, mock_query):
        expected_query = '''
        SELECT ?dcid ?obsDate
        WHERE { 
            ?svObservation typeOf StatVarObservation .
            ?svObservation variableMeasured test_stat_var . 
            ?svObservation observationAbout geoId/06 .
            ?svObservation dcid ?dcid .
            ?svObservation observationDate ?obsDate .
            
            
        }
    '''
        obs_date = "2001"
        expected_obs_id = "test_obs_id"

        def side_effect(query):
            if query == expected_query:
                return (['?dcid', '?obsDate'], [{
                    'cells': [{
                        'value': expected_obs_id
                    }, {
                        'value': obs_date
                    }]
                }])
            else:
                return ([], [])

        mock_query.side_effect = side_effect
        response = app.test_client().get(
            'api/browser/observation-ids-map?statVar=test_stat_var&place=geoId/06'
        )
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result[obs_date] == expected_obs_id

    @patch('routes.api.browser.dc.query')
    def test_with_optional_predicates(self, mock_query):
        expected_query = '''
        SELECT ?dcid ?obsDate
        WHERE { 
            ?svObservation typeOf StatVarObservation .
            ?svObservation variableMeasured test_stat_var . 
            ?svObservation observationAbout geoId/06 .
            ?svObservation dcid ?dcid .
            ?svObservation observationDate ?obsDate .
            ?svObservation measurementMethod testMethod .
            ?svObservation observationPeriod testObsPeriod .
        }
    '''
        obs_date = "2001"
        expected_obs_id = "test_obs_id"

        def side_effect(query):
            if query == expected_query:
                return (['?dcid', '?obsDate'], [{
                    'cells': [{
                        'value': expected_obs_id
                    }, {
                        'value': obs_date
                    }]
                }])
            else:
                return ([], [])

        mock_query.side_effect = side_effect
        response = app.test_client().get(
            'api/browser/observation-ids-map?statVar=test_stat_var&place=geoId/06&measurementMethod=testMethod&obsPeriod=testObsPeriod'
        )
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result[obs_date] == expected_obs_id


class TestObservationId(unittest.TestCase):

    def test_required_predicates(self):
        """Failure if required fields are not present."""
        no_stat_var = app.test_client().get(
            '/api/browser/observation-id?place=country/USA&date=2021')
        assert no_stat_var.status_code == 400

        no_place = app.test_client().get(
            '/api/browser/observation-id?statVar=testStatVar&date=2021')
        assert no_place.status_code == 400

        no_date = app.test_client().get(
            '/api/browser/observation-id?statVar=testStatVar&place=country/USA')
        assert no_place.status_code == 400

    @patch('routes.api.browser.dc.query')
    def test_observation_node_dcid_returned(self, mock_query):
        expected_query = '''
        SELECT ?dcid 
        WHERE { 
            ?svObservation typeOf StatVarObservation .
            ?svObservation variableMeasured test_stat_var . 
            ?svObservation observationAbout geoId/06 .
            ?svObservation dcid ?dcid .
            ?svObservation observationDate "2021" .
            
            
        }
    '''
        expected_obs_id = "test_obs_id"

        def side_effect(query):
            if query == expected_query:
                return (['?dcid'], [{'cells': [{'value': expected_obs_id}]}])
            else:
                return ([], [])

        mock_query.side_effect = side_effect
        response = app.test_client().get(
            'api/browser/observation-id?statVar=test_stat_var&place=geoId/06&date=2021'
        )
        assert response.status_code == 200
        assert json.loads(response.data) == expected_obs_id

    @patch('routes.api.browser.dc.query')
    def test_with_optional_predicates(self, mock_query):
        expected_query = '''
        SELECT ?dcid 
        WHERE { 
            ?svObservation typeOf StatVarObservation .
            ?svObservation variableMeasured test_stat_var . 
            ?svObservation observationAbout geoId/06 .
            ?svObservation dcid ?dcid .
            ?svObservation observationDate "2021" .
            ?svObservation measurementMethod testMethod .
            ?svObservation observationPeriod testObsPeriod .
        }
    '''
        expected_obs_id = "test_obs_id"

        def side_effect(query):
            if query == expected_query:
                return (['?dcid'], [{'cells': [{'value': expected_obs_id}]}])
            else:
                return ([], [])

        mock_query.side_effect = side_effect
        response = app.test_client().get(
            'api/browser/observation-id?statVar=test_stat_var&place=geoId/06&date=2021&measurementMethod=testMethod&obsPeriod=testObsPeriod'
        )
        assert response.status_code == 200
        assert json.loads(response.data) == expected_obs_id


class TestStatVarHierarchy(unittest.TestCase):

    @patch('routes.api.browser.dc.get_statvar_groups')
    def test_get_statvar_hierarchy(self, mock_sv_groups):
        mock_sv_groups.return_value = {
            "group1": {
                "absoluteName":
                    "group 1",
                "childStatVars": [{
                    "id": "sv1",
                    "searchName": "sv1",
                    "displayName": "sv1"
                }, {
                    "id": "sv2",
                    "searchName": "sv2",
                    "displayName": "sv2"
                }],
                "childStatVarGroups": [{
                    "id": "group4",
                    "specializedEntity": "specializedEntity4"
                }, {
                    "id": "group3",
                    "specializedEntity": "specializedEntity3"
                }],
            },
            "group2": {
                "absoluteName":
                    "group 2",
                "childStatVarGroups": [{
                    "id": "group1",
                    "specializedEntity": "specializedEntity1"
                }]
            },
            "group3": {
                "absoluteName":
                    "group 3",
                "childStatVars": [{
                    "id": "sv3",
                    "searchName": "sv3",
                    "displayName": "sv3"
                }, {
                    "id": "sv4",
                    "searchName": "sv4",
                    "displayName": "sv4"
                }],
            },
            "group4": {
                "absoluteName":
                    "group 4",
                "childStatVars": [{
                    "id": "sv5",
                    "searchName": "sv5",
                    "displayName": "sv5"
                }, {
                    "id": "sv6",
                    "searchName": "sv6",
                    "displayName": "sv6"
                }],
            },
            "group5": {
                "absoluteName":
                    "group 5",
                "childStatVars": [{
                    "id": "sv7",
                    "searchName": "sv7",
                    "displayName": "sv7"
                }, {
                    "id": "sv8",
                    "searchName": "sv8",
                    "displayName": "sv8"
                }],
            }
        }
        response = app.test_client().get(
            'api/browser/statvar-hierarchy/geoId/06')
        assert response.status_code == 200
        result = json.loads(response.data)
        expected_result = {
            'statVarGroups': {
                'group1': {
                    'absoluteName': 'group 1',
                    'childStatVars': [{
                        'id': 'sv1',
                        'searchName': 'sv1',
                        'displayName': 'sv1',
                        'parent': 'group1',
                        'level': 2
                    }, {
                        'id': 'sv2',
                        'searchName': 'sv2',
                        'displayName': 'sv2',
                        'parent': 'group1',
                        'level': 2
                    }],
                    'childStatVarGroups': [{
                        'id': 'group4',
                        'specializedEntity': 'specializedEntity4'
                    }, {
                        'id': 'group3',
                        'specializedEntity': 'specializedEntity3'
                    }],
                    'level': 1,
                    'parent': 'group2'
                },
                'group4': {
                    'absoluteName': 'group 4',
                    'childStatVars': [{
                        'id': 'sv5',
                        'searchName': 'sv5',
                        'displayName': 'sv5',
                        'parent': 'group4',
                        'level': 3
                    }, {
                        'id': 'sv6',
                        'searchName': 'sv6',
                        'displayName': 'sv6',
                        'parent': 'group4',
                        'level': 3
                    }],
                    'parent': 'group1',
                    'level': 2
                },
                'group3': {
                    'absoluteName': 'group 3',
                    'childStatVars': [{
                        'id': 'sv3',
                        'searchName': 'sv3',
                        'displayName': 'sv3',
                        'parent': 'group3',
                        'level': 3
                    }, {
                        'id': 'sv4',
                        'searchName': 'sv4',
                        'displayName': 'sv4',
                        'parent': 'group3',
                        'level': 3
                    }],
                    'parent': 'group1',
                    'level': 2
                },
                'group2': {
                    'absoluteName': 'group 2',
                    'childStatVarGroups': [{
                        'id': 'group1',
                        'specializedEntity': 'specializedEntity1'
                    }],
                    'level': 0
                },
                'group5': {
                    'absoluteName': 'group 5',
                    'childStatVars': [{
                        'id': 'sv7',
                        'searchName': 'sv7',
                        'displayName': 'sv7',
                        'parent': 'group5',
                        'level': 1
                    }, {
                        'id': 'sv8',
                        'searchName': 'sv8',
                        'displayName': 'sv8',
                        'parent': 'group5',
                        'level': 1
                    }],
                    'level': 0
                }
            },
            'statVars': {
                'sv1': {
                    'id': 'sv1',
                    'searchName': 'sv1',
                    'displayName': 'sv1',
                    'parent': 'group1',
                    'level': 2
                },
                'sv2': {
                    'id': 'sv2',
                    'searchName': 'sv2',
                    'displayName': 'sv2',
                    'parent': 'group1',
                    'level': 2
                },
                'sv5': {
                    'id': 'sv5',
                    'searchName': 'sv5',
                    'displayName': 'sv5',
                    'parent': 'group4',
                    'level': 3
                },
                'sv6': {
                    'id': 'sv6',
                    'searchName': 'sv6',
                    'displayName': 'sv6',
                    'parent': 'group4',
                    'level': 3
                },
                'sv3': {
                    'id': 'sv3',
                    'searchName': 'sv3',
                    'displayName': 'sv3',
                    'parent': 'group3',
                    'level': 3
                },
                'sv4': {
                    'id': 'sv4',
                    'searchName': 'sv4',
                    'displayName': 'sv4',
                    'parent': 'group3',
                    'level': 3
                },
                'sv7': {
                    'id': 'sv7',
                    'searchName': 'sv7',
                    'displayName': 'sv7',
                    'parent': 'group5',
                    'level': 1
                },
                'sv8': {
                    'id': 'sv8',
                    'searchName': 'sv8',
                    'displayName': 'sv8',
                    'parent': 'group5',
                    'level': 1
                }
            }
        }
        assert result == expected_result


class TestSearchStatVarHierarchy(unittest.TestCase):

    @patch('routes.api.browser.svh_search.get_search_result')
    def test_search_statvar_hierarchy_single_token(self, mock_search_result):
        expected_query = ["person"]
        expected_result = ['group_1', 'group_2']

        def side_effect(query):
            if query == expected_query:
                return expected_result
            else:
                return []

        mock_search_result.side_effect = side_effect
        response = app.test_client().get(
            'api/browser/search_statvar_hierarchy?query=person')
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result == expected_result

    @patch('routes.api.browser.svh_search.get_search_result')
    def test_search_statvar_hierarchy_single_token_comma(
            self, mock_search_result):
        expected_query = ["person"]
        expected_result = ['group_1', 'group_2']

        def side_effect(query):
            if query == expected_query:
                return expected_result
            else:
                return []

        mock_search_result.side_effect = side_effect
        response = app.test_client().get(
            'api/browser/search_statvar_hierarchy?query=person,')
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result == expected_result

    @patch('routes.api.browser.svh_search.get_search_result')
    def test_search_statvar_hierarchy_multiple_tokens(self, mock_search_result):
        expected_query = ["person", "age", "race"]
        expected_result = ['group_1', 'group_2']

        def side_effect(query):
            if query == expected_query:
                return expected_result
            else:
                return []

        mock_search_result.side_effect = side_effect
        response = app.test_client().get(
            'api/browser/search_statvar_hierarchy?query=person%20age%20race')
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result == expected_result

    @patch('routes.api.browser.svh_search.get_search_result')
    def test_search_statvar_hierarchy_multiple_tokens_comma(
            self, mock_search_result):
        expected_query = ["person", "age", "race"]
        expected_result = ['group_1', 'group_2']

        def side_effect(query):
            if query == expected_query:
                return expected_result
            else:
                return []

        mock_search_result.side_effect = side_effect
        response = app.test_client().get(
            'api/browser/search_statvar_hierarchy?query=person%20age,race')
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result == expected_result
