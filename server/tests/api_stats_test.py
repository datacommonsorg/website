import json
import unittest
import routes.api.stats as stats_api
from unittest import mock
from unittest.mock import patch

from main import app
from services import datacommons as dc


class TestIsValidGetCsvDate(unittest.TestCase):

    def test_is_valid_get_csv_date(self):
        cases = [{
            'date': 'latest',
            'expected': True
        }, {
            'date': '',
            'expected': True
        }, {
            'date': '2020',
            'expected': True
        }, {
            'date': '2020-01',
            'expected': True
        }, {
            'date': '2020-01-01',
            'expected': True
        }, {
            'date': '20211',
            'expected': False
        }, {
            'date': '2020-011',
            'expected': False
        }, {
            'date': '2021-01-910',
            'expected': False
        }, {
            'date': 'abc',
            'expected': False
        }]
        for test_case in cases:
            result = stats_api.is_valid_get_csv_date(test_case.get("date"))
            assert result == test_case.get("expected")


class TestDateGreaterEqualMin(unittest.TestCase):

    def test_date_greater_equal_min(self):
        cases = [{
            'date': '',
            'min_date': '',
            'expected': False
        }, {
            'date': '2020',
            'min_date': '',
            'expected': True
        }, {
            'date': '2020',
            'min_date': '2020',
            'expected': True
        }, {
            'date': '2021',
            'min_date': '2020',
            'expected': True
        }, {
            'date': '2020',
            'min_date': '2020-01',
            'expected': True
        }, {
            'date': '2021',
            'min_date': '2020-01',
            'expected': True
        }, {
            'date': '2020-01',
            'min_date': '2020',
            'expected': True
        }, {
            'date': '2021-01',
            'min_date': '2020',
            'expected': True
        }, {
            'date': '2020',
            'min_date': '2021',
            'expected': False
        }]
        for test_case in cases:
            result = stats_api.date_greater_equal_min(test_case.get("date"),
                                                      test_case.get("min_date"))
            assert result == test_case.get("expected")


class TestDateLesserEqualMax(unittest.TestCase):

    def test_date_lesser_equal_max(self):
        cases = [{
            'date': '',
            'max_date': '',
            'expected': False
        }, {
            'date': '2020',
            'max_date': '',
            'expected': True
        }, {
            'date': '2020',
            'max_date': '2020',
            'expected': True
        }, {
            'date': '2019',
            'max_date': '2020',
            'expected': True
        }, {
            'date': '2020',
            'max_date': '2020-01',
            'expected': True
        }, {
            'date': '2019',
            'max_date': '2020-01',
            'expected': True
        }, {
            'date': '2020-01',
            'max_date': '2020',
            'expected': True
        }, {
            'date': '2019-01',
            'max_date': '2020',
            'expected': True
        }, {
            'date': '2022',
            'max_date': '2021',
            'expected': False
        }]
        for test_case in cases:
            result = stats_api.date_lesser_equal_max(test_case.get("date"),
                                                     test_case.get("max_date"))
            assert result == test_case.get("expected")


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


class TestApiGetStatSetWithinPlace(unittest.TestCase):

    def test_required_predicates(self):
        """Failure if required fields are not present."""
        no_parent_place = app.test_client().get(
            '/api/stats/within-place?child_type=City&stat_vars=Count_Person')
        assert no_parent_place.status_code == 400

        no_child_type = app.test_client().get(
            '/api/stats/within-place?parent_place=country/USA&stat_vars=Count_Person'
        )
        assert no_child_type.status_code == 400

        no_stat_var = app.test_client().get(
            '/api/stats/within-place?parent_place=country/USA&child_type=City')
        assert no_stat_var.status_code == 400

    @mock.patch('services.datacommons.send_request')
    def test_api_get_stats_set_within_place(self, send_request):

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
            if req_url == dc.API_ROOT + "/stat/set/within-place" and req_json == {
                    'parent_place': 'geoId/10',
                    'child_type': 'County',
                    'date': '2018',
                    'stat_vars': ['Count_Person', 'Count_Person_Male']
            } and post and not has_payload:
                return result

        send_request.side_effect = side_effect
        response = app.test_client().get(
            '/api/stats/within-place?parent_place=geoId/10&child_type=County'
            '&date=2018&stat_vars=Count_Person&stat_vars=Count_Person_Male')
        assert response.status_code == 200
        assert json.loads(response.data) == result

    @mock.patch('services.datacommons.send_request')
    def test_api_get_stat_set_within_place_no_date(self, send_request):

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
            if req_url == dc.API_ROOT + "/stat/set/within-place" and req_json == {
                    'parent_place': 'geoId/10',
                    'child_type': 'County',
                    'date': None,
                    'stat_vars': ['Count_Person', 'Count_Person_Male']
            } and post and not has_payload:
                return result

        send_request.side_effect = side_effect
        response = app.test_client().get(
            '/api/stats/within-place?parent_place=geoId/10&child_type=County'
            '&stat_vars=Count_Person&stat_vars=Count_Person_Male')
        assert response.status_code == 200
        assert json.loads(response.data) == result

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
        expected_places = ["geoId/06"]
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

        def side_effect(svg, places):
            if svg == expected_svg and places == expected_places:
                return expected_result
            else:
                return {}

        mock_result.side_effect = side_effect
        response = app.test_client().get(
            'api/stats/stat-var-group?stat_var_group=dc/g/Root&places=geoId/06')
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


class TestGetStatsWithinPlaceCsv(unittest.TestCase):

    def test_required_params(self):
        """Failure if required fields are not present."""
        no_parent_place = app.test_client().get(
            'api/stats/csv/within-place?childType=County&statVars=Count_Person')
        assert no_parent_place.status_code == 400

        no_child_type = app.test_client().get(
            'api/stats/csv/within-place?parentPlace=country/USA&statVars=Count_Person'
        )
        assert no_child_type.status_code == 400

        no_stat_vars = app.test_client().get(
            'api/stats/csv/within-place?parentPlace=country/USA&childType=County'
        )
        assert no_stat_vars.status_code == 400

    @mock.patch('routes.api.stats.dc.get_stat_set_within_place')
    @mock.patch('routes.api.stats.cached_name')
    def test_single_date(self, mock_place_names, mock_stat_set):
        expected_parent_place = "country/USA"
        expected_child_type = "State"
        children_places = ["geoId/01", "geoId/02", "geoId/06"]
        expected_stat_vars = ["Count_Person", "UnemploymentRate_Person"]
        expected_date = "2015"

        def place_side_effect(places):
            if places == "^".join(children_places):
                return {
                    "geoId/01": "Alabama",
                    "geoId/02": "",
                    "geoId/06": "California"
                }
            else:
                return {}

        mock_place_names.side_effect = place_side_effect

        def stat_set_side_effect(parent_place, child_type, stat_vars, date):
            if parent_place != expected_parent_place or child_type != expected_child_type or stat_vars != expected_stat_vars:
                return {}
            if date == "":
                return {
                    "data": {
                        "UnemploymentRate_Person": {
                            "stat": {
                                "geoId/06": {
                                    "date": "2022-03",
                                    "value": 2.8,
                                    "metaHash": 324358135
                                },
                                "geoId/02": {
                                    "date": "2022-03",
                                    "value": 3.2,
                                    "metaHash": 324358135
                                },
                                "geoId/01": {
                                    "date": "2022-03",
                                    "value": 4.2,
                                    "metaHash": 324358135
                                },
                            }
                        },
                        "Count_Person": {
                            "stat": {
                                "geoId/01": {
                                    "date": "2020",
                                    "value": 6696893,
                                    "metaHash": 1145703171
                                },
                                "geoId/02": {
                                    "date": "2020",
                                    "value": 581348,
                                    "metaHash": 1145703171
                                },
                                "geoId/06": {
                                    "date": "2020",
                                    "value": 1923826,
                                    "metaHash": 1145703171
                                },
                            }
                        }
                    },
                    "metadata": {
                        "324358135": {
                            "importName": "BLS_LAUS",
                            "provenanceUrl": "https://www.bls.gov/lau/",
                            "measurementMethod": "BLSSeasonallyUnadjusted",
                            "observationPeriod": "P1M"
                        },
                        "1145703171": {
                            "importName": "CensusACS5YearSurvey",
                            "provenanceUrl": "https://www.census.gov/",
                            "measurementMethod": "CensusACS5yrSurvey"
                        },
                    }
                }
            if date == expected_date:
                return {
                    "data": {
                        "UnemploymentRate_Person": {
                            "stat": {
                                "geoId/02": {
                                    "date": "2015",
                                    "value": 5.6,
                                    "metaHash": 2978659163
                                },
                                "geoId/01": {
                                    "date": "2015",
                                    "value": 12,
                                    "metaHash": 2978659163
                                },
                                "geoId/06": {
                                    "date": "2015",
                                    "value": 3.7,
                                    "metaHash": 2978659163
                                },
                            }
                        },
                        "Count_Person": {
                            "stat": {
                                "geoId/01": {
                                    "date": "2015",
                                    "value": 3120960,
                                    "metaHash": 2517965213
                                },
                                "geoId/02": {
                                    "date": "2015",
                                    "value": 625216,
                                    "metaHash": 2517965213
                                },
                                "geoId/06": {
                                    "date": "2015",
                                    "value": 9931715,
                                    "metaHash": 2517965213
                                },
                            }
                        }
                    },
                    "metadata": {
                        "2517965213": {
                            "importName":
                                "CensusPEP",
                            "provenanceUrl":
                                "https://www.census.gov/programs-surveys/popest.html",
                            "measurementMethod":
                                "CensusPEPSurvey"
                        },
                        "2978659163": {
                            "importName": "BLS_LAUS",
                            "provenanceUrl": "https://www.bls.gov/lau/",
                            "measurementMethod": "BLSSeasonallyUnadjusted",
                            "observationPeriod": "P1Y"
                        }
                    }
                }

        mock_stat_set.side_effect = stat_set_side_effect
        endpoint_constant_part = f'api/stats/csv/within-place?parentPlace={expected_parent_place}&childType={expected_child_type}&statVars={expected_stat_vars[0]}&statVars={expected_stat_vars[1]}'
        latest_date = app.test_client().get(endpoint_constant_part +
                                            '&minDate=latest&maxDate=latest')
        assert latest_date.status_code == 200
        assert latest_date.data.decode("utf-8") == (
            'placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n'
            +
            'geoId/01,Alabama,2020,6696893,https://www.census.gov/,2022-03,4.2,https://www.bls.gov/lau/\r\n'
            +
            'geoId/02,,2020,581348,https://www.census.gov/,2022-03,3.2,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,2020,1923826,https://www.census.gov/,2022-03,2.8,https://www.bls.gov/lau/\r\n'
        )
        single_date = app.test_client().get(
            endpoint_constant_part +
            f'&minDate={expected_date}&maxDate={expected_date}')
        assert single_date.status_code == 200
        assert single_date.data.decode("utf-8") == (
            'placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n'
            +
            'geoId/01,Alabama,2015,3120960,https://www.census.gov/programs-surveys/popest.html,2015,12,https://www.bls.gov/lau/\r\n'
            +
            'geoId/02,,2015,625216,https://www.census.gov/programs-surveys/popest.html,2015,5.6,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,2015,9931715,https://www.census.gov/programs-surveys/popest.html,2015,3.7,https://www.bls.gov/lau/\r\n'
        )

    @mock.patch('routes.api.stats.dc.get_stat_set_series_within_place')
    @mock.patch('routes.api.stats.cached_name')
    def test_date_range(self, mock_place_names, mock_stat_set_series):
        expected_parent_place = "country/USA"
        expected_child_type = "State"
        children_places = ["geoId/01", "geoId/06"]
        expected_stat_vars = ["Count_Person", "UnemploymentRate_Person"]
        expected_min_date_year = "2015"
        expected_max_date_year = "2018"
        expected_min_date_month = "2015-01"
        expected_max_date_month = "2018-01"

        def place_side_effect(places):
            if places == "^".join(children_places):
                return {"geoId/01": "", "geoId/06": "California"}
            else:
                return {}

        mock_place_names.side_effect = place_side_effect

        def stat_set_series_side_effect(parent_place, child_type, stat_vars):
            if parent_place == expected_parent_place and child_type == expected_child_type and stat_vars == expected_stat_vars:
                return {
                    "data": {
                        "geoId/01": {
                            "data": {
                                "Count_Person": {
                                    "val": {
                                        "2014": 1021869,
                                        "2015": 1030475,
                                        "2017": 1052482,
                                        "2018": 1060665,
                                        "2019": 1068778
                                    },
                                    "metadata": {
                                        "importName":
                                            "CensusPEP",
                                        "provenanceUrl":
                                            "https://www.census.gov/programs-surveys/popest.html",
                                        "measurementMethod":
                                            "CensusPEPSurvey"
                                    }
                                },
                                "UnemploymentRate_Person": {
                                    "val": {
                                        "1979-01": 6.6,
                                        "2018-01": 4.5,
                                        "2015-05": 4.2,
                                        "2018-07": 3.9,
                                        "2017-11": 4,
                                        "2019-05": 3.6,
                                    },
                                    "metadata": {
                                        "importName":
                                            "BLS_LAUS",
                                        "provenanceUrl":
                                            "https://www.bls.gov/lau/",
                                        "measurementMethod":
                                            "BLSSeasonallyUnadjusted",
                                        "observationPeriod":
                                            "P1M"
                                    }
                                }
                            }
                        },
                        "geoId/06": {
                            "data": {
                                "Count_Person": {
                                    "val": {
                                        "2014": 2817628,
                                        "2015": 2866939,
                                        "2016": 2917563,
                                        "2017": 2969905,
                                    },
                                    "metadata": {
                                        "importName":
                                            "CensusPEP",
                                        "provenanceUrl":
                                            "https://www.census.gov/programs-surveys/popest.html",
                                        "measurementMethod":
                                            "CensusPEPSurvey"
                                    }
                                },
                                "UnemploymentRate_Person": {
                                    "val": {
                                        "2015-10": 6.4,
                                        "2017-05": 4.8,
                                        "1991-08": 5.6,
                                        "2018-08": 4.3,
                                        "2018-03": 4.6,
                                        "2020-04": 1.2,
                                    },
                                    "metadata": {
                                        "importName":
                                            "BLS_LAUS",
                                        "provenanceUrl":
                                            "https://www.bls.gov/lau/",
                                        "measurementMethod":
                                            "BLSSeasonallyUnadjusted",
                                        "observationPeriod":
                                            "P1M"
                                    }
                                }
                            }
                        },
                    }
                }
            else:
                return {}

        mock_stat_set_series.side_effect = stat_set_series_side_effect
        endpoint_constant_part = f'api/stats/csv/within-place?parentPlace={expected_parent_place}&childType={expected_child_type}&statVars={expected_stat_vars[0]}&statVars={expected_stat_vars[1]}'

        all_dates = app.test_client().get(endpoint_constant_part)
        assert all_dates.status_code == 200
        assert all_dates.data.decode("utf-8") == (
            'placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n'
            + 'geoId/01,,,,,1979-01,6.6,https://www.bls.gov/lau/\r\n' +
            'geoId/01,,2014,1021869,https://www.census.gov/programs-surveys/popest.html,,,\r\n'
            +
            'geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n'
            + 'geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n' +
            'geoId/01,,2019,1068778,https://www.census.gov/programs-surveys/popest.html,2019-05,3.6,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,,,,1991-08,5.6,https://www.bls.gov/lau/\r\n' +
            'geoId/06,California,2014,2817628,https://www.census.gov/programs-surveys/popest.html,,,\r\n'
            +
            'geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n'
            +
            'geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n' +
            'geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n' +
            'geoId/06,California,,,,2020-04,1.2,https://www.bls.gov/lau/\r\n')

        min_year = app.test_client().get(endpoint_constant_part +
                                         f'&minDate={expected_min_date_year}')
        assert min_year.status_code == 200
        assert min_year.data.decode("utf-8") == (
            'placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n'
            +
            'geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n'
            + 'geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n' +
            'geoId/01,,2019,1068778,https://www.census.gov/programs-surveys/popest.html,2019-05,3.6,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n'
            +
            'geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n' +
            'geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n' +
            'geoId/06,California,,,,2020-04,1.2,https://www.bls.gov/lau/\r\n')

        min_month = app.test_client().get(endpoint_constant_part +
                                          f'&minDate={expected_min_date_month}')
        assert min_month.status_code == 200
        assert min_month.data.decode("utf-8") == (
            'placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n'
            +
            'geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n'
            + 'geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n' +
            'geoId/01,,2019,1068778,https://www.census.gov/programs-surveys/popest.html,2019-05,3.6,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n'
            +
            'geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n' +
            'geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n' +
            'geoId/06,California,,,,2020-04,1.2,https://www.bls.gov/lau/\r\n')

        max_year = app.test_client().get(endpoint_constant_part +
                                         f'&maxDate={expected_max_date_year}')
        assert max_year.status_code == 200
        assert max_year.data.decode("utf-8") == (
            'placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n'
            + 'geoId/01,,,,,1979-01,6.6,https://www.bls.gov/lau/\r\n' +
            'geoId/01,,2014,1021869,https://www.census.gov/programs-surveys/popest.html,,,\r\n'
            +
            'geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n'
            + 'geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n' +
            'geoId/06,California,,,,1991-08,5.6,https://www.bls.gov/lau/\r\n' +
            'geoId/06,California,2014,2817628,https://www.census.gov/programs-surveys/popest.html,,,\r\n'
            +
            'geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n'
            +
            'geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n' +
            'geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n')

        max_month = app.test_client().get(endpoint_constant_part +
                                          f'&maxDate={expected_max_date_month}')
        assert max_month.status_code == 200
        assert max_month.data.decode("utf-8") == (
            'placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n'
            + 'geoId/01,,,,,1979-01,6.6,https://www.bls.gov/lau/\r\n' +
            'geoId/01,,2014,1021869,https://www.census.gov/programs-surveys/popest.html,,,\r\n'
            +
            'geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,,,,1991-08,5.6,https://www.bls.gov/lau/\r\n' +
            'geoId/06,California,2014,2817628,https://www.census.gov/programs-surveys/popest.html,,,\r\n'
            +
            'geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n'
            +
            'geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n'
        )

        min_and_max_year = app.test_client().get(
            endpoint_constant_part +
            f'&minDate={expected_min_date_year}&maxDate={expected_max_date_year}'
        )
        assert min_and_max_year.status_code == 200
        assert min_and_max_year.data.decode("utf-8") == (
            'placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n'
            +
            'geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n'
            + 'geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n' +
            'geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n'
            +
            'geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n' +
            'geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n')

        min_and_max_month = app.test_client().get(
            endpoint_constant_part +
            f'&minDate={expected_min_date_month}&maxDate={expected_max_date_month}'
        )
        assert min_and_max_month.status_code == 200
        assert min_and_max_month.data.decode("utf-8") == (
            'placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n'
            +
            'geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n'
            +
            'geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n'
        )

        min_year_max_month = app.test_client().get(
            endpoint_constant_part +
            f'&minDate={expected_min_date_year}&maxDate={expected_max_date_month}'
        )
        assert min_year_max_month.status_code == 200
        assert min_year_max_month.data.decode("utf-8") == (
            'placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n'
            +
            'geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n'
            +
            'geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n'
        )

        min_month_max_year = app.test_client().get(
            endpoint_constant_part +
            f'&minDate={expected_min_date_month}&maxDate={expected_max_date_year}'
        )
        assert min_month_max_year.status_code == 200
        assert min_month_max_year.data.decode("utf-8") == (
            'placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n'
            +
            'geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n'
            + 'geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n' +
            'geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n'
            +
            'geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n'
            +
            'geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n' +
            'geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n')


class TestGetFacetsWithinPlace(unittest.TestCase):

    def test_required_params(self):
        """Failure if required fields are not present."""
        no_parent_place = app.test_client().get(
            'api/stats/facets/within-place?childType=County&statVars=Count_Person'
        )
        assert no_parent_place.status_code == 400

        no_child_type = app.test_client().get(
            'api/stats/facets/within-place?parentPlace=country/USA&statVars=Count_Person'
        )
        assert no_child_type.status_code == 400

        no_stat_vars = app.test_client().get(
            'api/stats/facets/within-place?parentPlace=country/USA&childType=County'
        )
        assert no_stat_vars.status_code == 400

    @mock.patch('routes.api.stats.dc.points_within')
    def test_single_date(self, mock_points_within):
        expected_parent_place = "country/USA"
        expected_child_type = "State"
        children_places = ["geoId/01", "geoId/02", "geoId/06"]
        expected_stat_vars = ["Count_Person", "UnemploymentRate_Person"]
        expected_date = "2005"

        def points_within_side_effect(parent_place, child_type, stat_vars, date,
                                      all_facets):
            if parent_place != expected_parent_place or child_type != expected_child_type or stat_vars != expected_stat_vars or not all_facets:
                return {}
            if date == "":
                return {
                    "facets": {
                        "377779557": {
                            "importName":
                                "CensusACS5YearSurvey_SubjectTables_S2601APR",
                            "measurementMethod":
                                "CensusACS5yrSurveySubjectTable",
                            "provenanceUrl":
                                "https://data.census.gov/cedsci/table?q=S2601APR&tid=ACSST5Y2019.S2601APR"
                        },
                        "1145703171": {
                            "importName": "CensusACS5YearSurvey",
                            "measurementMethod": "CensusACS5yrSurvey",
                            "provenanceUrl": "https://www.census.gov/"
                        },
                        "1151455814": {
                            "importName":
                                "OECDRegionalDemography",
                            "measurementMethod":
                                "OECDRegionalStatistics",
                            "observationPeriod":
                                "P1Y",
                            "provenanceUrl":
                                "https://stats.oecd.org/Index.aspx?DataSetCode=REGION_DEMOGR#"
                        },
                        "1249140336": {
                            "importName": "BLS_LAUS",
                            "measurementMethod": "BLSSeasonallyAdjusted",
                            "observationPeriod": "P1M",
                            "provenanceUrl": "https://www.bls.gov/lau/"
                        },
                        "1541763368": {
                            "importName":
                                "USDecennialCensus_RedistrictingRelease",
                            "measurementMethod":
                                "USDecennialCensus",
                            "provenanceUrl":
                                "https://www.census.gov/programs-surveys/decennial-census/about/rdo/summary-files.html"
                        },
                        "2176550201": {
                            "importName":
                                "USCensusPEP_Annual_Population",
                            "measurementMethod":
                                "CensusPEPSurvey",
                            "observationPeriod":
                                "P1Y",
                            "provenanceUrl":
                                "https://www2.census.gov/programs-surveys/popest/tables"
                        },
                        "2517965213": {
                            "importName":
                                "CensusPEP",
                            "measurementMethod":
                                "CensusPEPSurvey",
                            "provenanceUrl":
                                "https://www.census.gov/programs-surveys/popest.html"
                        },
                        "2978659163": {
                            "importName": "BLS_LAUS",
                            "measurementMethod": "BLSSeasonallyUnadjusted",
                            "observationPeriod": "P1Y",
                            "provenanceUrl": "https://www.bls.gov/lau/"
                        },
                        "3114843463": {
                            "importName": "HumanCuratedStats",
                            "measurementMethod": "HumanCuratedStats",
                            "provenanceUrl": "https://google.com"
                        },
                        "3144703963": {
                            "importName":
                                "CensusACS5YearSurvey_SubjectTables_S2602PR",
                            "measurementMethod":
                                "CensusACS5yrSurveySubjectTable",
                            "provenanceUrl":
                                "https://data.census.gov/cedsci/table?q=S2602PR&tid=ACSST5Y2019.S2602PR"
                        }
                    },
                    "observationsByVariable": [{
                        "observationsByEntity": [
                            {
                                "entity":
                                    "geoId/01",
                                "pointsByFacet": [{
                                    "date": "2019",
                                    "facet": 2517965213,
                                    "value": 4903185
                                }, {
                                    "date": "2020",
                                    "facet": 1145703171,
                                    "value": 4893186
                                }, {
                                    "date": "2020",
                                    "facet": 1541763368,
                                    "value": 5024279
                                }, {
                                    "date": "2020",
                                    "facet": 2176550201,
                                    "value": 4921532
                                }, {
                                    "date": "2019",
                                    "facet": 1151455814,
                                    "value": 4903190
                                }, {
                                    "date": "2011",
                                    "facet": 3114843463,
                                    "value": 4802740
                                }]
                            },
                            {
                                "entity":
                                    "geoId/02",
                                "pointsByFacet": [{
                                    "date": "2019",
                                    "facet": 2517965213,
                                    "value": 731545
                                }, {
                                    "date": "2020",
                                    "facet": 1145703171,
                                    "value": 736990
                                }, {
                                    "date": "2020",
                                    "facet": 1541763368,
                                    "value": 733391
                                }, {
                                    "date": "2020",
                                    "facet": 2176550201,
                                    "value": 731158
                                }, {
                                    "date": "2019",
                                    "facet": 1151455814,
                                    "value": 731545
                                }, {
                                    "date": "2012",
                                    "facet": 3114843463,
                                    "value": 731449
                                }]
                            },
                        ],
                        "variable": "Count_Person"
                    }, {
                        "observationsByEntity": [
                            {
                                "entity":
                                    "geoId/01",
                                "pointsByFacet": [{
                                    "date": "2021",
                                    "facet": 2978659163,
                                    "value": 3.4
                                }, {
                                    "date": "2022-04",
                                    "facet": 1249140336,
                                    "value": 2.8
                                }]
                            },
                            {
                                "entity":
                                    "geoId/02",
                                "pointsByFacet": [{
                                    "date": "2021",
                                    "facet": 2978659163,
                                    "value": 6.4
                                }, {
                                    "date": "2022-04",
                                    "facet": 1249140336,
                                    "value": 4.9
                                }]
                            },
                        ],
                        "variable": "UnemploymentRate_Person"
                    }]
                }
            if date == expected_date:
                return {
                    "facets": {
                        "1151455814": {
                            "importName":
                                "OECDRegionalDemography",
                            "measurementMethod":
                                "OECDRegionalStatistics",
                            "observationPeriod":
                                "P1Y",
                            "provenanceUrl":
                                "https://stats.oecd.org/Index.aspx?DataSetCode=REGION_DEMOGR#"
                        },
                        "2176550201": {
                            "importName":
                                "USCensusPEP_Annual_Population",
                            "measurementMethod":
                                "CensusPEPSurvey",
                            "observationPeriod":
                                "P1Y",
                            "provenanceUrl":
                                "https://www2.census.gov/programs-surveys/popest/tables"
                        },
                        "2458695583": {
                            "importName":
                                "WikidataPopulation",
                            "measurementMethod":
                                "WikidataPopulation",
                            "provenanceUrl":
                                "https://www.wikidata.org/wiki/Wikidata:Main_Page"
                        },
                        "2517965213": {
                            "importName":
                                "CensusPEP",
                            "measurementMethod":
                                "CensusPEPSurvey",
                            "provenanceUrl":
                                "https://www.census.gov/programs-surveys/popest.html"
                        },
                        "2978659163": {
                            "importName": "BLS_LAUS",
                            "measurementMethod": "BLSSeasonallyUnadjusted",
                            "observationPeriod": "P1Y",
                            "provenanceUrl": "https://www.bls.gov/lau/"
                        }
                    },
                    "observationsByVariable": [{
                        "observationsByEntity": [{
                            "entity":
                                "geoId/01",
                            "pointsByFacet": [{
                                "date": "2005",
                                "facet": 2517965213,
                                "value": 4542912
                            }, {
                                "date": "2005",
                                "facet": 2176550201,
                                "value": 4569805
                            }, {
                                "date": "2005",
                                "facet": 1151455814,
                                "value": 4569810
                            }]
                        }, {
                            "entity":
                                "geoId/02",
                            "pointsByFacet": [{
                                "date": "2005",
                                "facet": 2517965213,
                                "value": 667114
                            }, {
                                "date": "2005",
                                "facet": 2176550201,
                                "value": 666946
                            }, {
                                "date": "2005",
                                "facet": 1151455814,
                                "value": 666946
                            }]
                        }],
                        "variable": "Count_Person"
                    }, {
                        "observationsByEntity": [{
                            "entity":
                                "geoId/01",
                            "pointsByFacet": [{
                                "date": "2005",
                                "facet": 2978659163,
                                "value": 4.4
                            }]
                        }, {
                            "entity":
                                "geoId/02",
                            "pointsByFacet": [{
                                "date": "2005",
                                "facet": 2458695583,
                                "value": 6.9
                            }]
                        }],
                        "variable": "UnemploymentRate_Person"
                    }]
                }

        mock_points_within.side_effect = points_within_side_effect
        endpoint_constant_part = f'api/stats/facets/within-place?parentPlace={expected_parent_place}&childType={expected_child_type}&statVars={expected_stat_vars[0]}&statVars={expected_stat_vars[1]}'
        latest_date = app.test_client().get(endpoint_constant_part +
                                            '&minDate=latest&maxDate=latest')
        assert latest_date.status_code == 200
        assert latest_date.data == b'{"Count_Person":{"1145703171":{"importName":"CensusACS5YearSurvey","measurementMethod":"CensusACS5yrSurvey","provenanceUrl":"https://www.census.gov/"},"1151455814":{"importName":"OECDRegionalDemography","measurementMethod":"OECDRegionalStatistics","observationPeriod":"P1Y","provenanceUrl":"https://stats.oecd.org/Index.aspx?DataSetCode=REGION_DEMOGR#"},"1541763368":{"importName":"USDecennialCensus_RedistrictingRelease","measurementMethod":"USDecennialCensus","provenanceUrl":"https://www.census.gov/programs-surveys/decennial-census/about/rdo/summary-files.html"},"2176550201":{"importName":"USCensusPEP_Annual_Population","measurementMethod":"CensusPEPSurvey","observationPeriod":"P1Y","provenanceUrl":"https://www2.census.gov/programs-surveys/popest/tables"},"2517965213":{"importName":"CensusPEP","measurementMethod":"CensusPEPSurvey","provenanceUrl":"https://www.census.gov/programs-surveys/popest.html"},"3114843463":{"importName":"HumanCuratedStats","measurementMethod":"HumanCuratedStats","provenanceUrl":"https://google.com"}},"UnemploymentRate_Person":{"1249140336":{"importName":"BLS_LAUS","measurementMethod":"BLSSeasonallyAdjusted","observationPeriod":"P1M","provenanceUrl":"https://www.bls.gov/lau/"},"2978659163":{"importName":"BLS_LAUS","measurementMethod":"BLSSeasonallyUnadjusted","observationPeriod":"P1Y","provenanceUrl":"https://www.bls.gov/lau/"}}}\n'
        single_date = app.test_client().get(
            endpoint_constant_part +
            f'&minDate={expected_date}&maxDate={expected_date}')
        assert single_date.status_code == 200
        assert single_date.data == b'{"Count_Person":{"1151455814":{"importName":"OECDRegionalDemography","measurementMethod":"OECDRegionalStatistics","observationPeriod":"P1Y","provenanceUrl":"https://stats.oecd.org/Index.aspx?DataSetCode=REGION_DEMOGR#"},"2176550201":{"importName":"USCensusPEP_Annual_Population","measurementMethod":"CensusPEPSurvey","observationPeriod":"P1Y","provenanceUrl":"https://www2.census.gov/programs-surveys/popest/tables"},"2517965213":{"importName":"CensusPEP","measurementMethod":"CensusPEPSurvey","provenanceUrl":"https://www.census.gov/programs-surveys/popest.html"}},"UnemploymentRate_Person":{"2458695583":{"importName":"WikidataPopulation","measurementMethod":"WikidataPopulation","provenanceUrl":"https://www.wikidata.org/wiki/Wikidata:Main_Page"},"2978659163":{"importName":"BLS_LAUS","measurementMethod":"BLSSeasonallyUnadjusted","observationPeriod":"P1Y","provenanceUrl":"https://www.bls.gov/lau/"}}}\n'

    @mock.patch('routes.api.stats.dc.series_within')
    def test_date_range(self, mock_series_within):
        expected_parent_place = "country/USA"
        expected_child_type = "State"
        children_places = ["geoId/01", "geoId/06"]
        expected_stat_vars = ["Count_Person", "UnemploymentRate_Person"]
        expected_min_date_year = "2015"
        expected_max_date_year = "2018"

        def series_within_side_effect(parent_place, child_type, stat_vars,
                                      all_facets):
            if parent_place == expected_parent_place and child_type == expected_child_type and stat_vars == expected_stat_vars and all_facets:
                return {
                    "facets": {
                        "324358135": {
                            "importName": "BLS_LAUS",
                            "measurementMethod": "BLSSeasonallyUnadjusted",
                            "observationPeriod": "P1M",
                            "provenanceUrl": "https://www.bls.gov/lau/"
                        },
                        "1145703171": {
                            "importName": "CensusACS5YearSurvey",
                            "measurementMethod": "CensusACS5yrSurvey",
                            "provenanceUrl": "https://www.census.gov/"
                        },
                        "1151455814": {
                            "importName":
                                "OECDRegionalDemography",
                            "measurementMethod":
                                "OECDRegionalStatistics",
                            "observationPeriod":
                                "P1Y",
                            "provenanceUrl":
                                "https://stats.oecd.org/Index.aspx?DataSetCode=REGION_DEMOGR#"
                        },
                        "1226172227": {
                            "importName": "CensusACS1YearSurvey",
                            "measurementMethod": "CensusACS1yrSurvey",
                            "provenanceUrl": "https://www.census.gov/"
                        },
                        "1249140336": {
                            "importName": "BLS_LAUS",
                            "measurementMethod": "BLSSeasonallyAdjusted",
                            "observationPeriod": "P1M",
                            "provenanceUrl": "https://www.bls.gov/lau/"
                        },
                        "1541763368": {
                            "importName":
                                "USDecennialCensus_RedistrictingRelease",
                            "measurementMethod":
                                "USDecennialCensus",
                            "provenanceUrl":
                                "https://www.census.gov/programs-surveys/decennial-census/about/rdo/summary-files.html"
                        },
                        "2176550201": {
                            "importName":
                                "USCensusPEP_Annual_Population",
                            "measurementMethod":
                                "CensusPEPSurvey",
                            "observationPeriod":
                                "P1Y",
                            "provenanceUrl":
                                "https://www2.census.gov/programs-surveys/popest/tables"
                        },
                        "2458695583": {
                            "importName":
                                "WikidataPopulation",
                            "measurementMethod":
                                "WikidataPopulation",
                            "provenanceUrl":
                                "https://www.wikidata.org/wiki/Wikidata:Main_Page"
                        },
                        "2517965213": {
                            "importName":
                                "CensusPEP",
                            "measurementMethod":
                                "CensusPEPSurvey",
                            "provenanceUrl":
                                "https://www.census.gov/programs-surveys/popest.html"
                        },
                        "2978659163": {
                            "importName": "BLS_LAUS",
                            "measurementMethod": "BLSSeasonallyUnadjusted",
                            "observationPeriod": "P1Y",
                            "provenanceUrl": "https://www.bls.gov/lau/"
                        },
                        "3114843463": {
                            "importName": "HumanCuratedStats",
                            "measurementMethod": "HumanCuratedStats",
                            "provenanceUrl": "https://google.com"
                        },
                        "3144703963": {
                            "importName":
                                "CensusACS5YearSurvey_SubjectTables_S2602PR",
                            "measurementMethod":
                                "CensusACS5yrSurveySubjectTable",
                            "provenanceUrl":
                                "https://data.census.gov/cedsci/table?q=S2602PR&tid=ACSST5Y2019.S2602PR"
                        }
                    },
                    "observationsByVariable": [{
                        "observationsByEntity": [{
                            "entity":
                                "geoId/01",
                            "seriesByFacet": [
                                {
                                    "facet":
                                        2517965213,
                                    "series": [{
                                        "date": "2018",
                                        "value": 4887681
                                    }, {
                                        "date": "2019",
                                        "value": 4903185
                                    }]
                                },
                                {
                                    "facet":
                                        1145703171,
                                    "series": [{
                                        "date": "2011",
                                        "value": 4747424
                                    }, {
                                        "date": "2012",
                                        "value": 4777326
                                    }]
                                },
                                {
                                    "facet":
                                        1541763368,
                                    "series": [{
                                        "date": "2000",
                                        "value": 4447100
                                    }, {
                                        "date": "2010",
                                        "value": 4779736
                                    }, {
                                        "date": "2020",
                                        "value": 5024279
                                    }]
                                },
                            ]
                        }, {
                            "entity": "geoId/02",
                            "seriesByFacet": [{
                                "facet":
                                    2517965213,
                                "series": [{
                                    "date": "2017",
                                    "value": 739700
                                }, {
                                    "date": "2018",
                                    "value": 735139
                                }, {
                                    "date": "2019",
                                    "value": 731545
                                }]
                            }, {
                                "entity":
                                    "geoId/04",
                                "seriesByFacet": [{
                                    "facet":
                                        2176550201,
                                    "series": [
                                        {
                                            "date": "1900",
                                            "value": 124000
                                        },
                                        {
                                            "date": "1901",
                                            "value": 131000
                                        },
                                        {
                                            "date": "1902",
                                            "value": 138000
                                        },
                                    ]
                                }]
                            }],
                            "variable": "Count_Person"
                        }, {
                            "observationsByEntity": [
                                {
                                    "entity":
                                        "geoId/01",
                                    "seriesByFacet": [
                                        {
                                            "facet":
                                                324358135,
                                            "series": [{
                                                "date": "2022-02",
                                                "value": 3.1
                                            }, {
                                                "date": "2022-03",
                                                "value": 2.5
                                            }, {
                                                "date": "2022-04",
                                                "value": 2.1
                                            }]
                                        },
                                        {
                                            "facet":
                                                2978659163,
                                            "series": [{
                                                "date": "2019",
                                                "value": 3.2
                                            }, {
                                                "date": "2020",
                                                "value": 6.5
                                            }, {
                                                "date": "2021",
                                                "value": 3.4
                                            }]
                                        },
                                    ]
                                },
                                {
                                    "entity":
                                        "geoId/05",
                                    "seriesByFacet": [{
                                        "facet":
                                            1249140336,
                                        "series": [{
                                            "date": "1976-01",
                                            "value": 7.3
                                        }, {
                                            "date": "1976-02",
                                            "value": 7.3
                                        }]
                                    }]
                                },
                            ],
                            "variable": "UnemploymentRate_Person"
                        }]
                    }]
                }
            else:
                return {}

        mock_series_within.side_effect = series_within_side_effect
        url = f'api/stats/facets/within-place?parentPlace={expected_parent_place}&childType={expected_child_type}&statVars={expected_stat_vars[0]}&statVars={expected_stat_vars[1]}&minDate={expected_min_date_year}&maxDate={expected_max_date_year}'
        resp = app.test_client().get(url)
        assert resp.status_code == 200
        assert resp.data == b'{"":{"1145703171":{"importName":"CensusACS5YearSurvey","measurementMethod":"CensusACS5yrSurvey","provenanceUrl":"https://www.census.gov/"},"1541763368":{"importName":"USDecennialCensus_RedistrictingRelease","measurementMethod":"USDecennialCensus","provenanceUrl":"https://www.census.gov/programs-surveys/decennial-census/about/rdo/summary-files.html"},"2517965213":{"importName":"CensusPEP","measurementMethod":"CensusPEPSurvey","provenanceUrl":"https://www.census.gov/programs-surveys/popest.html"}}}\n'
