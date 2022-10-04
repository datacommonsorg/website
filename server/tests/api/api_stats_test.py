import json
import unittest
import routes.api.shared as shared
from unittest import mock

from main import app
from services import datacommons as dc


class TestApiStatsProperty(unittest.TestCase):

    @mock.patch('services.datacommons.send_request')
    def test_api_get_stats_property(self, send_request):

        def side_effect(req_url,
                        req_json={},
                        compress=False,
                        post=True,
                        has_payload=True):
            if req_json == {
                    'dcids': [
                        'DifferenceRelativeToBaseDate2006-01_Daily_Min_Temperature_RCP26'
                    ]
            }:
                return {
                    'DifferenceRelativeToBaseDate2006-01_Daily_Min_Temperature_RCP26': [{
                        'objectId':
                            'StatisticalVariable',
                        'objectName':
                            'StatisticalVariable',
                        'objectTypes': ['Class'],
                        'predicate':
                            'typeOf',
                        'provenanceId':
                            'dc/d7tbsb1',
                        'subjectId':
                            'DifferenceRelativeToBaseDate2006-01_Daily_Min_Temperature_RCP26'
                    }, {
                        'objectId':
                            'minValue',
                        'objectName':
                            'minValue',
                        'objectTypes': ['Property'],
                        'predicate':
                            'statType',
                        'provenanceId':
                            'dc/d7tbsb1',
                        'subjectId':
                            'DifferenceRelativeToBaseDate2006-01_Daily_Min_Temperature_RCP26'
                    }, {
                        'objectId':
                            'dc/d7tbsb1',
                        'objectName':
                            'https://datacommons.org',
                        'objectTypes': ['Provenance'],
                        'predicate':
                            'provenance',
                        'provenanceId':
                            'dc/d7tbsb1',
                        'subjectId':
                            'DifferenceRelativeToBaseDate2006-01_Daily_Min_Temperature_RCP26'
                    }, {
                        'objectId':
                            'Place',
                        'objectName':
                            'Place',
                        'objectTypes': ['Class'],
                        'predicate':
                            'populationType',
                        'provenanceId':
                            'dc/d7tbsb1',
                        'subjectId':
                            'DifferenceRelativeToBaseDate2006-01_Daily_Min_Temperature_RCP26'
                    }, {
                        'objectValue':
                            'Min Temperature of 2006-01, RCP 2.6 (Difference '
                            'Relative To Base Date & Daily)',
                        'predicate':
                            'name',
                        'provenanceId':
                            'dc/d7tbsb1',
                        'subjectId':
                            'DifferenceRelativeToBaseDate2006-01_Daily_Min_Temperature_RCP26'
                    }, {
                        'objectId':
                            'dc/g/Place_BaseDate-200601_EmissionsScenario-RCP2.6',
                        'objectName':
                            'Place With Base Date = 2006-01, Emissions Scenario = '
                            'RCP 2.6',
                        'objectTypes': ['StatVarGroup'],
                        'predicate':
                            'memberOf',
                        'provenanceId':
                            'dc/d7tbsb1',
                        'subjectId':
                            'DifferenceRelativeToBaseDate2006-01_Daily_Min_Temperature_RCP26'
                    }, {
                        'objectId':
                            'DifferenceRelativeToBaseDate&Daily',
                        'objectTypes': ['Thing'],
                        'predicate':
                            'measurementQualifier',
                        'provenanceId':
                            'dc/d7tbsb1',
                        'subjectId':
                            'DifferenceRelativeToBaseDate2006-01_Daily_Min_Temperature_RCP26'
                    }, {
                        'objectId':
                            'temperature',
                        'objectName':
                            'temperature',
                        'objectTypes': ['Property'],
                        'predicate':
                            'measuredProperty',
                        'provenanceId':
                            'dc/d7tbsb1',
                        'subjectId':
                            'DifferenceRelativeToBaseDate2006-01_Daily_Min_Temperature_RCP26'
                    }, {
                        'objectId':
                            'RCP2.6',
                        'objectName':
                            'RCP2.6',
                        'objectTypes': [
                            'RepresentativeConcentrationPathwayEnum'
                        ],
                        'predicate':
                            'emissionsScenario',
                        'provenanceId':
                            'dc/d7tbsb1',
                        'subjectId':
                            'DifferenceRelativeToBaseDate2006-01_Daily_Min_Temperature_RCP26'
                    }, {
                        'objectValue':
                            'Daily minimum near-surface air temperature under '
                            'RCP2.6 emissions scenario',
                        'predicate':
                            'description',
                        'provenanceId':
                            'dc/d7tbsb1',
                        'subjectId':
                            'DifferenceRelativeToBaseDate2006-01_Daily_Min_Temperature_RCP26'
                    }, {
                        'objectId':
                            'emissionsScenario',
                        'objectName':
                            'emissionsScenario',
                        'objectTypes': ['Property'],
                        'predicate':
                            'constraintProperties',
                        'provenanceId':
                            'dc/d7tbsb1',
                        'subjectId':
                            'DifferenceRelativeToBaseDate2006-01_Daily_Min_Temperature_RCP26'
                    }, {
                        'objectValue':
                            '2006-01',
                        'predicate':
                            'baseDate',
                        'provenanceId':
                            'dc/d7tbsb1',
                        'subjectId':
                            'DifferenceRelativeToBaseDate2006-01_Daily_Min_Temperature_RCP26'
                    }]
                }

        send_request.side_effect = side_effect
        response = app.test_client().get(
            '/api/stats/stats-var-property?dcid=DifferenceRelativeToBaseDate2006-01_Daily_Min_Temperature_RCP26'
        )
        assert response.status_code == 200
        assert json.loads(response.data) == {
            'DifferenceRelativeToBaseDate2006-01_Daily_Min_Temperature_RCP26': {
                'mprop':
                    'temperature',
                'pt':
                    'Place',
                'md':
                    '',
                'st':
                    'minValue',
                'mq':
                    'DifferenceRelativeToBaseDate&Daily',
                'pvs': {
                    'emissionsScenario': 'RCP2.6'
                },
                'title':
                    'Min Temperature of 2006-01, RCP 2.6 (Difference Relative To Base Date & Daily)',
                'ranked':
                    False
            }
        }


class TestSearchStatVar(unittest.TestCase):

    @mock.patch('routes.api.stats.dc.search_statvar')
    def test_search_statvar_single_token(self, mock_search_result):
        expected_query = 'person'
        expected_places = ["geoId/06"]
        expected_result = {'statVarGroups': ['group_1', 'group_2']}
        expected_sv_only_result = {'statVars': [{'name': 'sv1', 'dcid': 'sv1'}]}

        def side_effect(query, places, sv_only):
            if query == expected_query and places == expected_places and not sv_only:
                return expected_result
            elif query == expected_query and places == expected_places and sv_only:
                return expected_sv_only_result
            else:
                return []

        with app.app_context():
            mock_search_result.side_effect = side_effect
            response = app.test_client().get(
                'api/stats/stat-var-search?query=person&places=geoId/06')
            assert response.status_code == 200
            result = json.loads(response.data)
            assert result == expected_result
            response = app.test_client().get(
                'api/stats/stat-var-search?query=person&places=geoId/06&svOnly=1'
            )
            assert response.status_code == 200
            result = json.loads(response.data)
            assert result == expected_sv_only_result


class TestGetStatVarGroup(unittest.TestCase):

    @mock.patch('routes.api.stats.dc.get_statvar_group')
    def test_statvar_path(self, mock_result):
        expected_svg = 'dc/g/Root'
        expected_entities = ["geoId/06"]
        expected_result = {
            "absoluteName":
                "Data Commons Variables",
            "childStatVarGroups": [{
                "id": "dc/g/Crime",
                "specializedEntity": "Crime",
                "displayName": "Crime"
            }, {
                "id": "dc/g/Demographics",
                "specializedEntity": "Demographics",
                "displayName": "Demographics"
            }]
        }

        def side_effect(svg, entities):
            if svg == expected_svg and entities == expected_entities:
                return expected_result
            else:
                return {}

        mock_result.side_effect = side_effect
        response = app.test_client().get(
            'api/stats/stat-var-group?stat_var_group=dc/g/Root&entities=geoId/06'
        )
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result == expected_result


class TestStatVarPath(unittest.TestCase):

    @mock.patch('routes.api.stats.dc.get_statvar_path')
    def test_statvar_path(self, mock_result):
        expected_id = 'Count_Person'
        expected_result = {"path": ["Count_Person", "dc/g/Demographics"]}

        def side_effect(id):
            if id == expected_id:
                return expected_result
            else:
                return {}

        mock_result.side_effect = side_effect
        response = app.test_client().get(
            'api/stats/stat-var-path?id=Count_Person')
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result == expected_result
