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


class TestObservationId(unittest.TestCase):

    def test_required_predicates(self):
        """Failure if required fields are not present."""
        no_stat_var = app.test_client().get(
            '/api/browser/observation-ids?place=country/USA')
        assert no_stat_var.status_code == 400

        no_place = app.test_client().get(
            '/api/browser/observation-ids?statVar=testStatVar')
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
            'api/browser/observation-ids?statVar=test_stat_var&place=geoId/06')
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
            'api/browser/observation-ids?statVar=test_stat_var&place=geoId/06&measurementMethod=testMethod&obsPeriod=testObsPeriod'
        )
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result[obs_date] == expected_obs_id


class TestStatVarHierarchy(unittest.TestCase):

    @patch('routes.api.browser.dc.get_statvar_groups')
    def test_get_statvar_hierarchy(self, mock_sv_groups):
        expected_sv_parents = {
            "sv1": "group1",
            "sv2": "group1",
            "sv3": "group3",
            "sv4": "group3",
            "sv5": "group4",
            "sv6": "group4",
            "sv7": "group5",
            "sv8": "group5",
        }
        expected_svg_parents = {
            "group1": ["group2"],
            "group2": [],
            "group3": ["group2"],
            "group4": ["group1", "group3"],
            "group5": []
        }
        expected_sv_levels = {
            "sv1": 2,
            "sv2": 2,
            "sv3": 2,
            "sv4": 2,
            "sv5": 3,
            "sv6": 3,
            "sv7": 1,
            "sv8": 1,
        }
        expected_svg_levels = {
            "group1": 1,
            "group2": 0,
            "group3": 1,
            "group4": 2,
            "group5": 0
        }
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
                }]
            },
            "group2": {
                "absoluteName":
                    "group 2",
                "childStatVarGroups": [{
                    "id": "group1",
                    "specializedEntity": "specializedEntity1"
                }, {
                    "id": "group3",
                    "specializedEntity": "specializedEntity3"
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
                "childStatVarGroups": [{
                    "id": "group4",
                    "specializedEntity": "specializedEntity4"
                }]
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
        sv_result = result["statVars"]
        svg_result = result["statVarGroups"]
        for sv in sv_result.keys():
            assert sv_result[sv].get("parent", "") == expected_sv_parents[sv]
            assert sv_result[sv]["level"] == expected_sv_levels[sv]
        for svg in svg_result.keys():
            parent = svg_result[svg].get("parent", None)
            if parent:
                assert parent in set(expected_svg_parents[svg])
            else:
                assert len(expected_svg_parents[svg]) == 0
            assert svg_result[svg]["level"] == expected_svg_levels[svg]
        assert expected_sv_parents.keys() == sv_result.keys()
        assert expected_svg_parents.keys() == svg_result.keys()


class TestSearchStatVarHierarchy(unittest.TestCase):

    def test_search_statvar_hierarchy_single_token(self):
        search_index = {
            'person': {'test_1', 'test_2', 'test_3'},
            'race': {'test_1', 'test_2', 'test_4'},
            'age': {'test', 'test_1', 'test_3', 'test_2'}
        }
        with app.app_context():
            app.config['STAT_VAR_SEARCH_INDEX'] = search_index
            response = app.test_client().get(
                'api/browser/search_statvar_hierarchy?query=person')
            assert response.status_code == 200
            result = json.loads(response.data)
            expected_result = ['test_1', 'test_2', 'test_3']
            assert set(result) == set(expected_result)

    def test_search_statvar_hierarchy_multiple_tokens(self):
        search_index = {
            'person': {'test_1', 'test_2', 'test_3'},
            'race': {'test_1', 'test_2', 'test_4'},
            'age': {'test', 'test_1', 'test_3', 'test_2'}
        }
        with app.app_context():
            app.config['STAT_VAR_SEARCH_INDEX'] = search_index
            response = app.test_client().get(
                'api/browser/search_statvar_hierarchy?query=person%20age%20race'
            )
            assert response.status_code == 200
            result = json.loads(response.data)
            expected_result = ['test_1', 'test_2']
            assert set(result) == set(expected_result)
