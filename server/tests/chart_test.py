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

import unittest
import json
from unittest.mock import patch

from main import app

import routes.api.chart as chart_api


class TestRoute(unittest.TestCase):

    @patch('routes.api.chart.dc_service.fetch_data')
    @patch('routes.api.chart.place_api.statsvars')
    def test_cache_necessary_dates(self, mock_stat_vars, mock_landing_page):
        mock_stat_vars.return_value = [
            'StatVar1', 'StatVar2', 'StatVar3', 'StatVar4', 'StatVar5',
            'StatVar6', 'StatVar7', 'StatVar8'
        ]
        mock_landing_page.return_value = {
            'geoId/06': {
                'StatVar1': {
                    'data': {
                        '2010': 200,
                        '2019': 200,
                        '2020': 200
                    }
                },
                'StatVar2': {
                    'data': {
                        '2017': 200,
                        '2018': 200,
                        '2019': 200
                    }
                },
                'StatVar3': {
                    'data': {
                        '2017': 200,
                        '2018': 200,
                        '2019': 200
                    }
                },
                'StatVar4': {
                    'data': {
                        '2016': 200,
                        '2018': 200,
                        '2020': 200
                    }
                },
                'StatVar5': {
                    'data': {
                        '2011': 200,
                        '2012': 200,
                        '2013': 200
                    }
                },
                'StatVar6': {
                    'data': {
                        '2018': 200,
                        '2019': 200,
                        '2020': 200
                    }
                },
                'StatVar7': {
                    'data': {
                        '2015': 200,
                        '2017': 200,
                        '2019': 200
                    }
                },
                'StatVar8': {
                    'data': {
                        '2018': 200,
                        '2019': 200,
                        '2020': 200
                    }
                },
            }
        }
        with app.app_context():
            app.config['CHART_CONFIG'] = [{
                'category': ['Test', 'Test1'],
                'title': 'Test1',
                'statsVars': [
                    'StatVar1', 'StatVar2', 'StatVar3', 'StatVar4', 'StatVar5'
                ],
                'isOverview': True
            }, {
                'category': ['Test', 'Test2'],
                'title':
                    'Test2',
                'statsVars': [
                    'StatVar1', 'StatVar2', 'StatVar6', 'StatVar7', 'StatVar8'
                ]
            }]
            response = app.test_client().get('api/chart/data/geoId/06')
            assert response.status_code == 200
            assert json.loads(response.data)['data'] == {
                'geoId/06': {
                    'StatVar1': {
                        'data': {
                            '2010': 200,
                            '2019': 200,
                            '2020': 200
                        }
                    },
                    'StatVar2': {
                        'data': {
                            '2017': 200,
                            '2018': 200,
                            '2019': 200
                        }
                    },
                    'StatVar3': {
                        'data': {
                            '2017': 200,
                            '2018': 200,
                            '2019': 200
                        }
                    },
                    'StatVar4': {
                        'data': {
                            '2016': 200,
                            '2018': 200,
                            '2020': 200
                        }
                    },
                    'StatVar5': {
                        'data': {
                            '2011': 200,
                            '2012': 200,
                            '2013': 200
                        }
                    },
                    'StatVar6': {
                        'data': {
                            '2018': 200,
                            '2019': 200,
                            '2020': 200
                        }
                    },
                    'StatVar7': {
                        'data': {
                            '2015': 200,
                            '2017': 200,
                            '2019': 200
                        }
                    },
                    'StatVar8': {
                        'data': {
                            '2018': 200,
                            '2019': 200,
                            '2020': 200
                        }
                    }
                }
            }


class TestChoroplethPlaces(unittest.TestCase):

    @patch('routes.api.chart.dc_service.get_places_in')
    @patch('routes.api.chart.place_api.get_place_type')
    def test_get_choropleth_places_has_display_level(self, mock_place_type,
                                                     mock_places_in):
        dcid = "test_dcid1"
        expected = ["dcid1", "dcid2"]

        def get_places_in_(*args):
            if args[1] == "AdministrativeArea1":
                return {dcid: expected}
            else:
                return {dcid: []}

        mock_place_type.return_value = "Country"
        mock_places_in.side_effect = get_places_in_
        result = chart_api.get_choropleth_places(dcid)
        assert result == expected

    @patch('routes.api.chart.dc_service.get_places_in')
    @patch('routes.api.chart.place_api.get_place_type')
    def test_get_choropleth_places_equivalent_has_display_level(
            self, mock_place_type, mock_places_in):
        dcid = "test_dcid2"
        expected = ["dcid1", "dcid2"]

        def get_places_in_(*args):
            if args[1] == "AdministrativeArea2":
                return {dcid: expected}
            else:
                return {dcid: []}

        mock_place_type.return_value = "AdministrativeArea1"
        mock_places_in.side_effect = get_places_in_
        result = chart_api.get_choropleth_places(dcid)
        assert result == expected

    @patch('routes.api.chart.dc_service.get_places_in')
    @patch('routes.api.chart.place_api.get_place_type')
    def test_get_choropleth_places_has_no_display_level(self, mock_place_type,
                                                        mock_places_in):
        dcid = "test_dcid3"

        def get_places_in_(*args):
            if args[1] == "AdministrativeArea1":
                return {dcid: ["dcid1", "dcid2"]}
            elif args[1] == "AdministrativeArea2":
                return {dcid: ["dcid1", "dcid2"]}
            else:
                return {dcid: []}

        mock_place_type.return_value = "County"
        mock_places_in.side_effect = get_places_in_
        result = chart_api.get_choropleth_places(dcid)
        assert result == []

    class TestGetGeoJson(unittest.TestCase):

        @staticmethod
        def side_effect(*args):
            return args[0]

        @patch(
            'routes.api.chart.choropleth_api.coerce_geojson_to_righthand_rule')
        @patch('routes.api.chart.dc_service.get_property_values')
        @patch('routes.api.chart.place_api.get_display_name')
        @patch('routes.api.chart.get_choropleth_places')
        def test_get_geojson(self, mock_places, mock_display_name,
                             mock_geojson_values, mock_choropleth_helper):
            dcid1 = "dcid1"
            dcid2 = "dcid2"
            mock_places.return_value = [dcid1, dcid2]
            mock_display_name.return_value = {dcid1: dcid1, dcid2: dcid2}
            mock_geojson_values.return_value = {
                dcid1: json.dumps({
                    "coordinates": [],
                    "type": "Polygon"
                }),
                dcid2: json.dumps({
                    "coordinates": [],
                    "type": "MultiPolygon"
                })
            }
            mock_choropleth_helper.side_effect = self.side_effect
            response = app.test_client().get('/api/chart/geojson/' + dcid1)
            assert response.status_code == 200
            response_data = json.loads(response.data)
            assert len(response_data['features']) == 2
            assert len(response_data['properties']['current_geo']) == dcid1


class TestChoroplethDataHelpers(unittest.TestCase):

    def test_get_choropleth_sv(self):
        with app.app_context():
            app.config['CHART_CONFIG'] = [{
                'category': ['Test', 'Test1'],
                'title': 'Test1',
                'statsVars': ['StatVar1'],
                'isOverview': True,
            }, {
                'category': ['Test', 'Test2'],
                'title': 'Test2',
                'statsVars': ['StatVar2'],
                'isChoropleth': False
            }, {
                'category': ['Test', 'Test2'],
                'title': 'Test2',
                'statsVars': ['StatVar3'],
                'isChoropleth': True
            }, {
                'category': ['Test', 'Test2'],
                'title': 'Test2',
                'statsVars': ['StatVar4'],
                'isChoropleth': True,
                'relatedChart': {
                    'scale': True,
                    'denominator': 'Test_Denominator'
                }
            }, {
                'category': ['Test', 'Test2'],
                'title': 'Test2',
                'statsVars': ['StatVar3'],
                'denominator': ['StatVar10'],
                'isChoropleth': True
            }, {
                'category': ['Test', 'Test2'],
                'title': 'Test2',
                'statsVars': ['StatVar4'],
                'isChoropleth': True,
                'relatedChart': {
                    'scale': True
                }
            }]
            expected_sv_set = {
                'StatVar3', 'StatVar4', 'StatVar10', 'Count_Person',
                'Test_Denominator'
            }
            expected_sv_denom_mapping = {
                'StatVar3': {'', 'StatVar10'},
                'StatVar4': {'Test_Denominator', 'Count_Person'}
            }
            actual_sv_set, actual_sv_denom_mapping = chart_api.get_choropleth_sv(
            )
            assert expected_sv_set == actual_sv_set
            assert expected_sv_denom_mapping == actual_sv_denom_mapping

    def test_get_data_for_statvar(self):
        test_stat_var = 'Test'
        test_stat_var2 = 'Test2'
        dcid1 = 'dcid1'
        dcid2 = 'dcid2'
        dcid3 = 'dcid3'
        ss1 = {'date1': 1, 'date2': 2}
        ss2 = {'date3': 1, 'date4': 2}
        test_data = {
            dcid1: {
                'statVarData': {}
            },
            dcid2: {
                'statVarData': {
                    test_stat_var: {
                        'sourceSeries': [{
                            'val': ss1
                        }, {
                            'val': ss2
                        }]
                    }
                }
            },
            dcid3: {
                'statVarData': {
                    test_stat_var: {
                        'sourceSeries': [{
                            'val': ss2
                        }]
                    },
                    test_stat_var2: {
                        'sourceSeries': [{
                            'val': ss1
                        }]
                    }
                }
            }
        }

        dcid2_data = dict(ss1)
        dcid2_data.update(ss2)
        expected = {dcid1: {}, dcid2: dcid2_data, dcid3: ss2}
        actual = chart_api.get_data_for_statvar(test_stat_var,
                                                [dcid1, dcid2, dcid3],
                                                test_data)
        assert actual == expected


class TestChoroplethData(unittest.TestCase):

    @patch('routes.api.chart.get_latest_common_date_for_sv')
    @patch('routes.api.chart.get_data_for_statvar')
    @patch('routes.api.chart.dc_service.get_stats_all')
    @patch('routes.api.chart.get_choropleth_places')
    @patch('routes.api.chart.get_choropleth_sv')
    def testRoute(self, mock_choropleth_sv, mock_choropleth_places,
                  mock_all_stats, mock_sv_data, mock_sv_date):
        test_dcid = 'test_dcid'
        geo1 = 'dcid1'
        geo2 = 'dcid2'
        sv_set = {'StatVar1', 'StatVar2', 'StatVar3'}
        sv_denom_mapping = {'StatVar1': {''}, 'StatVar3': {'StatVar2'}}
        geos = [geo1, geo2]
        mock_choropleth_sv.return_value = sv_set, sv_denom_mapping
        mock_choropleth_places.return_value = geos
        stats_all_return_value = {
            geo1: {
                'statVarData': {}
            },
            geo2: {
                'statVarData': {}
            }
        }

        def all_stats_side_effect(*args):
            if args[0] == geos and args[1] == list(sv_set):
                return {'placeData': stats_all_return_value}
            else:
                return {}

        mock_all_stats.side_effect = all_stats_side_effect

        sv_date1 = 'date1'
        sv_date2 = 'date2'
        sv_val1 = 1
        sv_val2 = 2
        sv1_data = {geo1: {sv_date1: sv_val1}, geo2: {sv_date1: sv_val1}}
        sv2_data = {geo1: {sv_date2: sv_val2}, geo2: {sv_date2: sv_val2}}
        sv3_data = {geo1: {sv_date1: sv_val1}, geo2: {sv_date1: sv_val1}}

        def sv_data_side_effect(*args):
            if args[1] == geos and args[2] == stats_all_return_value:
                if args[0] == 'StatVar1':
                    return sv1_data
                elif args[0] == 'StatVar2':
                    return sv2_data
                elif args[0] == 'StatVar3':
                    return sv3_data
                else:
                    return {}
            else:
                return {}

        mock_sv_data.side_effect = sv_data_side_effect

        def sv_date_side_effect(*args):
            if args[0] == sv1_data:
                return sv_date1
            elif args[0] == sv2_data:
                return sv_date2
            elif args[0] == sv3_data:
                return sv_date1
            else:
                return None

        mock_sv_date.side_effect = sv_date_side_effect

        response = app.test_client().get('/api/chart/choroplethdata/' +
                                         test_dcid)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        expected_data = {
            'StatVar1': {
                'date': sv_date1,
                'data': {
                    geo1: sv_val1,
                    geo2: sv_val1
                },
                'numDataPoints': 2
            },
            'StatVar3': {
                'date': sv_date1,
                'data': {
                    geo1: sv_val1 / sv_val2,
                    geo2: sv_val1 / sv_val2
                },
                'numDataPoints': 2
            }
        }
        assert response_data == expected_data
