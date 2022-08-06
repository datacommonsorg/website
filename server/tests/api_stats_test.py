import json
import unittest
import routes.api.stats as stats_api
from unittest import mock
from unittest.mock import patch

from main import app
from services import datacommons as dc

SERIES_WITHIN_ALL_FACETS = {
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
        "1249140336": {
            "importName": "BLS_LAUS",
            "measurementMethod": "BLSSeasonallyAdjusted",
            "observationPeriod": "P1M",
            "provenanceUrl": "https://www.bls.gov/lau/"
        },
        "2517965213": {
            "importName":
                "CensusPEP",
            "measurementMethod":
                "CensusPEPSurvey",
            "provenanceUrl":
                "https://www.census.gov/programs-surveys/popest.html"
        },
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
                        "date": "2014",
                        "value": 1021869
                    }, {
                        "date": "2015",
                        "value": 1030475
                    }, {
                        "date": "2017",
                        "value": 1052482
                    }, {
                        "date": "2018",
                        "value": 1060665
                    }, {
                        "date": "2019",
                        "value": 1068778
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
            ]
        }, {
            "entity":
                "geoId/06",
            "seriesByFacet": [{
                "facet":
                    2517965213,
                "series": [{
                    "date": "2014",
                    "value": 2817628
                }, {
                    "date": "2015",
                    "value": 2866939
                }, {
                    "date": "2016",
                    "value": 2917563
                }, {
                    "date": "2017",
                    "value": 2969905
                }]
            }],
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
                            "date": "1979-01",
                            "value": 6.6
                        }, {
                            "date": "2018-01",
                            "value": 4.5
                        }, {
                            "date": "2015-05",
                            "value": 4.2
                        }, {
                            "date": "2018-07",
                            "value": 3.9
                        }, {
                            "date": "2017-11",
                            "value": 4
                        }, {
                            "date": "2019-05",
                            "value": 3.6
                        }]
                    },
                    {
                        "facet":
                            1249140336,
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
                    "geoId/06",
                "seriesByFacet": [{
                    "facet":
                        324358135,
                    "series": [{
                        "date": "2015-10",
                        "value": 6.4
                    }, {
                        "date": "2017-05",
                        "value": 4.8
                    }, {
                        "date": "1991-08",
                        "value": 5.6
                    }, {
                        "date": "2018-08",
                        "value": 4.3
                    }, {
                        "date": "2018-03",
                        "value": 4.6
                    }, {
                        "date": "2020-04",
                        "value": 1.2
                    }]
                }]
            },
        ],
        "variable": "UnemploymentRate_Person"
    }]
}

POINTS_WITHIN_LATEST_ALL_FACETS = {
    "facets": {
        "1145703171": {
            "importName": "CensusACS5YearSurvey",
            "measurementMethod": "CensusACS5yrSurvey",
            "provenanceUrl": "https://www.census.gov/"
        },
        "1249140336": {
            "importName": "BLS_LAUS",
            "measurementMethod": "BLSSeasonallyAdjusted",
            "observationPeriod": "P1M",
            "provenanceUrl": "https://www.bls.gov/lau/"
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
        "324358135": {
            "importName": "BLS_LAUS",
            "measurementMethod": "BLSSeasonallyUnadjusted",
            "observationPeriod": "P1M",
            "provenanceUrl": "https://www.bls.gov/lau/"
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
                }]
            },
            {
                "entity":
                    "geoId/06",
                "pointsByFacet": [{
                    "date": "2019",
                    "facet": 2517965213,
                    "value": 731745
                }, {
                    "date": "2020",
                    "facet": 1145703171,
                    "value": 836990
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
                    "date": "2022-03",
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
                    "date": "2022-03",
                    "facet": 2978659163,
                    "value": 6.4
                }, {
                    "date": "2022-04",
                    "facet": 1249140336,
                    "value": 4.9
                }]
            },
            {
                "entity":
                    "geoId/02",
                "pointsByFacet": [{
                    "date": "2022-03",
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

POINTS_WITHIN_2015_ALL_FACETS = {
    "facets": {
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
        }
    },
    "observationsByVariable": [{
        "observationsByEntity": [{
            "entity":
                "geoId/01",
            "pointsByFacet": [{
                "date": "2015",
                "facet": 2517965213,
                "value": 3120960
            }]
        }, {
            "entity":
                "geoId/02",
            "pointsByFacet": [{
                "date": "2015",
                "facet": 2517965213,
                "value": 625216
            }, {
                "date": "2015",
                "facet": 2176550201,
                "value": 686946
            }]
        }, {
            "entity":
                "geoId/06",
            "pointsByFacet": [{
                "date": "2015",
                "facet": 2517965213,
                "value": 9931715
            }]
        }],
        "variable": "Count_Person"
    }, {
        "observationsByEntity": [{
            "entity":
                "geoId/01",
            "pointsByFacet": [{
                "date": "2015",
                "facet": 2978659163,
                "value": 12
            }]
        }, {
            "entity":
                "geoId/06",
            "pointsByFacet": [{
                "date": "2015",
                "facet": 2978659163,
                "value": 3.7
            }]
        }, {
            "entity":
                "geoId/02",
            "pointsByFacet": [{
                "date": "2015",
                "facet": 2978659163,
                "value": 5.6
            }]
        }],
        "variable": "UnemploymentRate_Person"
    }]
}


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
            'api/stats/stat-var-group?stat_var_group=dc/g/Root&entities=geoId/06')
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
        no_parent_place = app.test_client().post(
            'api/stats/csv/within-place',
            json={
                "childType": "County",
                "statVars": ["Count_Person"],
            })
        assert no_parent_place.status_code == 400

        no_child_type = app.test_client().post('api/stats/csv/within-place',
                                               json={
                                                   "parentPlace": "country/USA",
                                                   "statVars": ["Count_Person"]
                                               })
        assert no_child_type.status_code == 400

        no_stat_vars = app.test_client().post('api/stats/csv/within-place',
                                              json={
                                                  "parentPlace": "country/USA",
                                                  "childType": "County"
                                              })
        assert no_stat_vars.status_code == 400

    @mock.patch('routes.api.stats.dc.points_within')
    @mock.patch('routes.api.stats.cached_name')
    def test_single_date(self, mock_place_names, mock_points_within):
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

        def points_within_side_effect(parent_place, child_type, stat_vars, date,
                                      all_facets):
            if parent_place != expected_parent_place or child_type != expected_child_type or set(
                    stat_vars) != set(expected_stat_vars):
                return {}
            if all_facets:
                if date == "":
                    return POINTS_WITHIN_LATEST_ALL_FACETS
                if date == expected_date:
                    return POINTS_WITHIN_2015_ALL_FACETS
            else:
                if date == "":
                    return {
                        "facets": {
                            "1145703171": {
                                "importName": "CensusACS5YearSurvey",
                                "measurementMethod": "CensusACS5yrSurvey",
                                "provenanceUrl": "https://www.census.gov/"
                            },
                            "324358135": {
                                "importName": "BLS_LAUS",
                                "measurementMethod": "BLSSeasonallyUnadjusted",
                                "observationPeriod": "P1M",
                                "provenanceUrl": "https://www.bls.gov/lau/"
                            }
                        },
                        "observationsByVariable": [{
                            "observationsByEntity": [
                                {
                                    "entity":
                                        "geoId/01",
                                    "pointsByFacet": [{
                                        "date": "2020",
                                        "facet": 1145703171,
                                        "value": 6696893
                                    }]
                                },
                                {
                                    "entity":
                                        "geoId/02",
                                    "pointsByFacet": [{
                                        "date": "2020",
                                        "facet": 1145703171,
                                        "value": 581348
                                    }]
                                },
                                {
                                    "entity":
                                        "geoId/06",
                                    "pointsByFacet": [{
                                        "date": "2020",
                                        "facet": 1145703171,
                                        "value": 1923826
                                    }]
                                },
                            ],
                            "variable": "Count_Person"
                        }, {
                            "observationsByEntity": [
                                {
                                    "entity":
                                        "geoId/06",
                                    "pointsByFacet": [{
                                        "date": "2022-04",
                                        "facet": 324358135,
                                        "value": 2.8
                                    }]
                                },
                                {
                                    "entity":
                                        "geoId/02",
                                    "pointsByFacet": [{
                                        "date": "2022-03",
                                        "facet": 324358135,
                                        "value": 3.2
                                    }]
                                },
                                {
                                    "entity":
                                        "geoId/01",
                                    "pointsByFacet": [{
                                        "date": "2022-03",
                                        "facet": 324358135,
                                        "value": 4.2
                                    }]
                                },
                            ],
                            "variable": "UnemploymentRate_Person"
                        }]
                    }

        mock_points_within.side_effect = points_within_side_effect
        endpoint_url = "api/stats/csv/within-place"
        base_req_json = {
            "parentPlace": expected_parent_place,
            "childType": expected_child_type,
            "statVars": expected_stat_vars
        }

        latest_date_req_json = base_req_json.copy()
        latest_date_req_json["minDate"] = "latest"
        latest_date_req_json["maxDate"] = "latest"
        latest_date = app.test_client().post(endpoint_url,
                                             json=latest_date_req_json)
        assert latest_date.status_code == 200
        assert latest_date.data.decode("utf-8") == (
            "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
            +
            "geoId/01,Alabama,2020,6696893,https://www.census.gov/,2022-03,4.2,https://www.bls.gov/lau/\r\n"
            +
            "geoId/02,,2020,581348,https://www.census.gov/,2022-03,3.2,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,2020,1923826,https://www.census.gov/,2022-04,2.8,https://www.bls.gov/lau/\r\n"
        )

        single_date_req_json = base_req_json.copy()
        single_date_req_json["minDate"] = expected_date
        single_date_req_json["maxDate"] = expected_date
        single_date = app.test_client().post(endpoint_url,
                                             json=single_date_req_json)
        assert single_date.status_code == 200
        assert single_date.data.decode("utf-8") == (
            "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
            +
            "geoId/01,Alabama,2015,3120960,https://www.census.gov/programs-surveys/popest.html,2015,12,https://www.bls.gov/lau/\r\n"
            +
            "geoId/02,,2015,625216,https://www.census.gov/programs-surveys/popest.html,2015,5.6,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,2015,9931715,https://www.census.gov/programs-surveys/popest.html,2015,3.7,https://www.bls.gov/lau/\r\n"
        )

        latest_date_facets_req_json = base_req_json.copy()
        latest_date_facets_req_json["minDate"] = "latest"
        latest_date_facets_req_json["maxDate"] = "latest"
        latest_date_facets_req_json["facetMap"] = {
            "Count_Person": "1145703171",
            "UnemploymentRate_Person": "1249140336"
        }
        latest_date_facets = app.test_client().post(
            endpoint_url, json=latest_date_facets_req_json)
        assert latest_date_facets.status_code == 200
        assert latest_date_facets.data.decode("utf-8") == (
            "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
            +
            "geoId/01,Alabama,2020,4893186,https://www.census.gov/,2022-04,2.8,https://www.bls.gov/lau/\r\n"
            +
            "geoId/02,,2020,736990,https://www.census.gov/,2022-04,4.9,https://www.bls.gov/lau/\r\n"
            + "geoId/06,California,2020,836990,https://www.census.gov/,,,\r\n")

        single_date_facets_req_json = base_req_json.copy()
        single_date_facets_req_json["minDate"] = expected_date
        single_date_facets_req_json["maxDate"] = expected_date
        single_date_facets_req_json["facetMap"] = {
            "Count_Person": "2517965213",
            "UnemploymentRate_Person": ""
        }
        single_date_facets = app.test_client().post(
            endpoint_url, json=single_date_facets_req_json)
        assert single_date_facets.status_code == 200
        assert single_date_facets.data.decode("utf-8") == (
            "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
            +
            "geoId/01,Alabama,2015,3120960,https://www.census.gov/programs-surveys/popest.html,2015,12,https://www.bls.gov/lau/\r\n"
            +
            "geoId/02,,2015,625216,https://www.census.gov/programs-surveys/popest.html,2015,5.6,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,2015,9931715,https://www.census.gov/programs-surveys/popest.html,2015,3.7,https://www.bls.gov/lau/\r\n"
        )

    @mock.patch('routes.api.stats.dc.series_within')
    @mock.patch('routes.api.stats.cached_name')
    def test_date_range(self, mock_place_names, mock_series_within):
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

        def series_within_side_effect(parent_place, child_type, stat_vars,
                                      all_facets):
            if parent_place == expected_parent_place and child_type == expected_child_type and stat_vars == expected_stat_vars and all_facets:
                return SERIES_WITHIN_ALL_FACETS
            else:
                return {}

        mock_series_within.side_effect = series_within_side_effect
        endpoint_url = "api/stats/csv/within-place"
        base_req_json = {
            "parentPlace": expected_parent_place,
            "childType": expected_child_type,
            "statVars": expected_stat_vars
        }

        all_dates = app.test_client().post(endpoint_url, json=base_req_json)
        assert all_dates.status_code == 200
        assert all_dates.data.decode("utf-8") == (
            "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
            + "geoId/01,,,,,1979-01,6.6,https://www.bls.gov/lau/\r\n" +
            "geoId/01,,2014,1021869,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
            +
            "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
            + "geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n" +
            "geoId/01,,2019,1068778,https://www.census.gov/programs-surveys/popest.html,2019-05,3.6,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,,,,1991-08,5.6,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,2014,2817628,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
            +
            "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
            +
            "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2020-04,1.2,https://www.bls.gov/lau/\r\n")

        min_year_req_json = base_req_json.copy()
        min_year_req_json["minDate"] = expected_min_date_year
        min_year = app.test_client().post(endpoint_url, json=min_year_req_json)
        assert min_year.status_code == 200
        assert min_year.data.decode("utf-8") == (
            "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
            +
            "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
            + "geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n" +
            "geoId/01,,2019,1068778,https://www.census.gov/programs-surveys/popest.html,2019-05,3.6,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
            +
            "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2020-04,1.2,https://www.bls.gov/lau/\r\n")

        min_month_req_json = base_req_json.copy()
        min_month_req_json["minDate"] = expected_min_date_month
        min_month = app.test_client().post(endpoint_url,
                                           json=min_month_req_json)
        assert min_month.status_code == 200
        assert min_month.data.decode("utf-8") == (
            "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
            +
            "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
            + "geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n" +
            "geoId/01,,2019,1068778,https://www.census.gov/programs-surveys/popest.html,2019-05,3.6,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
            +
            "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2020-04,1.2,https://www.bls.gov/lau/\r\n")

        max_year_req_json = base_req_json.copy()
        max_year_req_json["maxDate"] = expected_max_date_year
        max_year = app.test_client().post(endpoint_url, json=max_year_req_json)
        assert max_year.status_code == 200
        assert max_year.data.decode("utf-8") == (
            "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
            + "geoId/01,,,,,1979-01,6.6,https://www.bls.gov/lau/\r\n" +
            "geoId/01,,2014,1021869,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
            +
            "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
            + "geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,1991-08,5.6,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,2014,2817628,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
            +
            "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
            +
            "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n")

        max_month_req_json = base_req_json.copy()
        max_month_req_json["maxDate"] = expected_max_date_month
        max_month = app.test_client().post(endpoint_url,
                                           json=max_month_req_json)
        assert max_month.status_code == 200
        assert max_month.data.decode("utf-8") == (
            "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
            + "geoId/01,,,,,1979-01,6.6,https://www.bls.gov/lau/\r\n" +
            "geoId/01,,2014,1021869,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
            +
            "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,,,,1991-08,5.6,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,2014,2817628,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
            +
            "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
            +
            "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
        )

        min_and_max_year_req_json = base_req_json.copy()
        min_and_max_year_req_json["minDate"] = expected_min_date_year
        min_and_max_year_req_json["maxDate"] = expected_max_date_year
        min_and_max_year = app.test_client().post(
            endpoint_url, json=min_and_max_year_req_json)
        assert min_and_max_year.status_code == 200
        assert min_and_max_year.data.decode("utf-8") == (
            "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
            +
            "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
            + "geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
            +
            "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n")

        min_and_max_month_req_json = base_req_json.copy()
        min_and_max_month_req_json["minDate"] = expected_min_date_month
        min_and_max_month_req_json["maxDate"] = expected_max_date_month
        min_and_max_month = app.test_client().post(
            endpoint_url, json=min_and_max_month_req_json)
        assert min_and_max_month.status_code == 200
        assert min_and_max_month.data.decode("utf-8") == (
            "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
            +
            "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
            +
            "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
        )

        min_year_max_month_req_json = base_req_json.copy()
        min_year_max_month_req_json["minDate"] = expected_min_date_year
        min_year_max_month_req_json["maxDate"] = expected_max_date_month
        min_year_max_month = app.test_client().post(
            endpoint_url, json=min_year_max_month_req_json)
        assert min_year_max_month.status_code == 200
        assert min_year_max_month.data.decode("utf-8") == (
            "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
            +
            "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
            +
            "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
        )

        min_month_max_year_req_json = base_req_json.copy()
        min_month_max_year_req_json["minDate"] = expected_min_date_month
        min_month_max_year_req_json["maxDate"] = expected_max_date_year
        min_month_max_year = app.test_client().post(
            endpoint_url, json=min_month_max_year_req_json)
        assert min_month_max_year.status_code == 200
        assert min_month_max_year.data.decode("utf-8") == (
            "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
            +
            "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
            + "geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
            +
            "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
            +
            "geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n")

        all_dates_facet_req_json = base_req_json.copy()
        all_dates_facet_req_json["facetMap"] = {
            "Count_Person": "1145703171",
            "UnemploymentRate_Person": ""
        }
        all_dates_facet = app.test_client().post(endpoint_url,
                                                 json=all_dates_facet_req_json)
        assert all_dates_facet.status_code == 200
        assert all_dates_facet.data.decode("utf-8") == (
            "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
            + "geoId/01,,,,,1979-01,6.6,https://www.bls.gov/lau/\r\n" +
            "geoId/01,,2011,4747424,https://www.census.gov/,,,\r\n" +
            "geoId/01,,2012,4777326,https://www.census.gov/,,,\r\n" +
            "geoId/01,,,,,2015-05,4.2,https://www.bls.gov/lau/\r\n" +
            "geoId/01,,,,,2017-11,4,https://www.bls.gov/lau/\r\n" +
            "geoId/01,,,,,2018-01,4.5,https://www.bls.gov/lau/\r\n" +
            "geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n" +
            "geoId/01,,,,,2019-05,3.6,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,1991-08,5.6,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2015-10,6.4,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2017-05,4.8,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2020-04,1.2,https://www.bls.gov/lau/\r\n")

        min_and_max_year_facet_req_json = base_req_json.copy()
        min_and_max_year_facet_req_json["minDate"] = expected_min_date_year
        min_and_max_year_facet_req_json["maxDate"] = expected_max_date_year
        min_and_max_year_facet_req_json["facetMap"] = {
            "Count_Person": "1145703171",
            "UnemploymentRate_Person": ""
        }
        min_and_max_year_facet = app.test_client().post(
            endpoint_url, json=min_and_max_year_facet_req_json)
        assert min_and_max_year_facet.status_code == 200
        assert min_and_max_year_facet.data.decode("utf-8") == (
            "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
            + "geoId/01,,,,,2015-05,4.2,https://www.bls.gov/lau/\r\n" +
            "geoId/01,,,,,2017-11,4,https://www.bls.gov/lau/\r\n" +
            "geoId/01,,,,,2018-01,4.5,https://www.bls.gov/lau/\r\n" +
            "geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2015-10,6.4,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2017-05,4.8,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n" +
            "geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n")


class TestGetFacetsWithinPlace(unittest.TestCase):

    def test_required_params(self):
        """Failure if required fields are not present."""
        no_parent_place = app.test_client().post(
            'api/stats/facets/within-place',
            json={
                "childType": "County",
                "statVars": ["Count_Person"],
            })
        assert no_parent_place.status_code == 400

        no_child_type = app.test_client().post('api/stats/facets/within-place',
                                               json={
                                                   "parentPlace": "country/USA",
                                                   "statVars": ["Count_Person"],
                                               })
        assert no_child_type.status_code == 400

        no_stat_vars = app.test_client().post('api/stats/facets/within-place',
                                              json={
                                                  "childType": "County",
                                                  "parentPlace": "country/USA",
                                              })
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
                return POINTS_WITHIN_LATEST_ALL_FACETS
            if date == expected_date:
                return POINTS_WITHIN_2015_ALL_FACETS

        mock_points_within.side_effect = points_within_side_effect
        endpoint_url = "api/stats/facets/within-place"
        base_req_json = {
            "parentPlace": expected_parent_place,
            "childType": expected_child_type,
            "statVars": expected_stat_vars
        }

        latest_date_req_json = base_req_json.copy()
        latest_date_req_json["minDate"] = "latest"
        latest_date_req_json["maxDate"] = "latest"
        latest_date = app.test_client().post(endpoint_url,
                                             json=latest_date_req_json)
        assert latest_date.status_code == 200
        assert latest_date.data == b'{"Count_Person":{"1145703171":{"importName":"CensusACS5YearSurvey","measurementMethod":"CensusACS5yrSurvey","provenanceUrl":"https://www.census.gov/"},"2517965213":{"importName":"CensusPEP","measurementMethod":"CensusPEPSurvey","provenanceUrl":"https://www.census.gov/programs-surveys/popest.html"}},"UnemploymentRate_Person":{"1249140336":{"importName":"BLS_LAUS","measurementMethod":"BLSSeasonallyAdjusted","observationPeriod":"P1M","provenanceUrl":"https://www.bls.gov/lau/"},"2978659163":{"importName":"BLS_LAUS","measurementMethod":"BLSSeasonallyUnadjusted","observationPeriod":"P1Y","provenanceUrl":"https://www.bls.gov/lau/"}}}\n'

        single_date_req_json = base_req_json.copy()
        single_date_req_json["minDate"] = expected_date
        single_date_req_json["maxDate"] = expected_date
        single_date = app.test_client().post(endpoint_url,
                                             json=single_date_req_json)
        assert single_date.status_code == 200
        assert single_date.data == b'{"Count_Person":{"2176550201":{"importName":"USCensusPEP_Annual_Population","measurementMethod":"CensusPEPSurvey","observationPeriod":"P1Y","provenanceUrl":"https://www2.census.gov/programs-surveys/popest/tables"},"2517965213":{"importName":"CensusPEP","measurementMethod":"CensusPEPSurvey","provenanceUrl":"https://www.census.gov/programs-surveys/popest.html"}},"UnemploymentRate_Person":{"2978659163":{"importName":"BLS_LAUS","measurementMethod":"BLSSeasonallyUnadjusted","observationPeriod":"P1Y","provenanceUrl":"https://www.bls.gov/lau/"}}}\n'

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
                return SERIES_WITHIN_ALL_FACETS
            else:
                return {}

        mock_series_within.side_effect = series_within_side_effect
        resp = app.test_client().post('api/stats/facets/within-place',
                                      json={
                                          "parentPlace": expected_parent_place,
                                          "childType": expected_child_type,
                                          "statVars": expected_stat_vars,
                                          "minDate": expected_min_date_year,
                                          "maxDate": expected_max_date_year
                                      })
        assert resp.status_code == 200
        assert resp.data == b'{"Count_Person":{"1145703171":{"importName":"CensusACS5YearSurvey","measurementMethod":"CensusACS5yrSurvey","provenanceUrl":"https://www.census.gov/"},"2517965213":{"importName":"CensusPEP","measurementMethod":"CensusPEPSurvey","provenanceUrl":"https://www.census.gov/programs-surveys/popest.html"}},"UnemploymentRate_Person":{"1249140336":{"importName":"BLS_LAUS","measurementMethod":"BLSSeasonallyAdjusted","observationPeriod":"P1M","provenanceUrl":"https://www.bls.gov/lau/"},"324358135":{"importName":"BLS_LAUS","measurementMethod":"BLSSeasonallyUnadjusted","observationPeriod":"P1M","provenanceUrl":"https://www.bls.gov/lau/"}}}\n'
