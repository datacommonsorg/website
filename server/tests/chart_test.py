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


class TestChoroplethPlaces(unittest.TestCase):

    @patch('routes.api.chart.place_api.parent_places')
    @patch('routes.api.chart.place_api.get_place_type')
    def test_get_choropleth_display_level_has_display_level(
            self, mock_place_type, mock_parents):
        dcid = "test_dcid1"

        mock_place_type.return_value = "Country"
        result = chart_api.get_choropleth_display_level(dcid)
        assert result == (dcid, "AdministrativeArea1")

    @patch('routes.api.chart.place_api.parent_places')
    @patch('routes.api.chart.place_api.get_place_type')
    def test_get_choropleth_display_level_equivalent_has_display_level(
            self, mock_place_type, mock_parents):
        dcid = "test_dcid2"

        mock_place_type.return_value = "AdministrativeArea1"
        result = chart_api.get_choropleth_display_level(dcid)
        assert result == (dcid, "AdministrativeArea2")

    @patch('routes.api.chart.place_api.parent_places')
    @patch('routes.api.chart.place_api.get_place_type')
    def test_get_choropleth_display_level_has_no_display_level(
            self, mock_place_type, mock_parents):
        dcid = "test_dcid3"
        parent_dcid = "parent_dcid"

        mock_place_type.return_value = "County"
        mock_parents.return_value = mock_parents.return_value = {
            dcid: [{
                'dcid': parent_dcid,
                'types': ['Country']
            }]
        }
        result = chart_api.get_choropleth_display_level(dcid)
        assert result == (None, None)

    @patch('routes.api.chart.place_api.parent_places')
    @patch('routes.api.chart.place_api.get_place_type')
    def test_get_choropleth_display_level_parent_places(self, mock_place_type,
                                                        mock_parents):
        dcid = "test_dcid4"
        parent_dcid = "parent_dcid"

        mock_place_type.return_value = "County"
        mock_parents.return_value = {
            dcid: [{
                'dcid': parent_dcid,
                'types': ['AdministrativeArea1']
            }]
        }
        result = chart_api.get_choropleth_display_level(dcid)
        assert result == (parent_dcid, "AdministrativeArea2")

    @patch('routes.api.chart.place_api.parent_places')
    @patch('routes.api.chart.place_api.get_place_type')
    def test_get_choropleth_display_level_parent_has_equivalent(
            self, mock_place_type, mock_parents):
        dcid = "test_dcid5"
        parent_dcid = "parent_dcid"

        mock_place_type.return_value = "County"
        mock_parents.return_value = {
            dcid: [{
                'dcid': parent_dcid,
                'types': ['State']
            }]
        }
        result = chart_api.get_choropleth_display_level(dcid)
        assert result == (parent_dcid, "AdministrativeArea2")

    class TestGetGeoJson(unittest.TestCase):

        @staticmethod
        def side_effect(*args):
            return args[0]

        @patch('routes.api.chart.dc_service.get_places_in')
        @patch(
            'routes.api.chart.choropleth_api.coerce_geojson_to_righthand_rule')
        @patch('routes.api.chart.dc_service.get_property_values')
        @patch('routes.api.chart.place_api.get_display_name')
        @patch('routes.api.chart.get_choropleth_display_level')
        def test_get_geojson(self, mock_display_level, mock_display_name,
                             mock_geojson_values, mock_choropleth_helper,
                             mock_places):
            dcid1 = "dcid1"
            dcid2 = "dcid2"
            mock_display_level.return_value = ("parentDcid", "State")

            def get_places_in_(*args):
                if args[0] == ["parentDcid"] and args[1] == "State":
                    return {"parentDcid": [dcid1, dcid2]}
                else:
                    return {args[0]: []}

            mock_places.side_effect = get_places_in_
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

    def test_get_choropleth_configs(self):
        cc1 = {
            'category': ['Test', 'Test1'],
            'title': 'Test1',
            'statsVars': ['StatVar1'],
            'isOverview': True,
        }
        cc2 = {
            'category': ['Test', 'Test2'],
            'title': 'Test2',
            'statsVars': ['StatVar2'],
            'isChoropleth': False
        }
        cc3 = {
            'category': ['Test', 'Test2'],
            'title': 'Test2',
            'statsVars': ['StatVar3'],
            'isChoropleth': True
        }

        with app.app_context():
            app.config['CHART_CONFIG'] = [cc1, cc2, cc3]
            expected_chart_configs = [cc3]
            actual_chart_configs = chart_api.get_choropleth_configs()
            assert expected_chart_configs == actual_chart_configs

    def test_get_choropleth_sv(self):
        cc1 = {
            'category': ['Test', 'Test2'],
            'title': 'Test2',
            'statsVars': ['StatVar4'],
            'isChoropleth': True,
            'relatedChart': {
                'scale': True,
                'denominator': 'Test_Denominator'
            }
        }
        cc2 = {
            'category': ['Test', 'Test2'],
            'title': 'Test2',
            'statsVars': ['StatVar5'],
            'denominator': ['StatVar6'],
            'isChoropleth': True
        }
        cc3 = {
            'category': ['Test', 'Test2'],
            'title': 'Test2',
            'statsVars': ['StatVar7'],
            'isChoropleth': True,
            'relatedChart': {
                'scale': True
            }
        }
        cc4 = {
            'category': ['Test', 'Test2'],
            'title': 'Test2',
            'statsVars': ['StatVar8'],
            'isChoropleth': True,
            'relatedChart': {
                'scale': False
            }
        }
        expected_sv_set = {'StatVar4', 'StatVar5', 'StatVar7', 'StatVar8'}
        expected_denom_set = {'StatVar6', 'Count_Person', 'Test_Denominator'}
        actual_sv_set, actual_denom_set = chart_api.get_stat_vars(
            [cc1, cc2, cc3, cc4])
        assert expected_sv_set == actual_sv_set
        assert expected_denom_set == actual_denom_set

    def test_get_denom_val(self):
        test_denom_data = {
            "2017-01": 1,
            "2018-01": 2,
            "2020-01": 3,
        }
        result_in_denom_data = chart_api.get_denom_val("2018-01",
                                                       test_denom_data)
        assert result_in_denom_data == 2
        result_earlier_than_denom_data = chart_api.get_denom_val(
            "2016-01", test_denom_data)
        assert result_earlier_than_denom_data == 1
        result_later_than_denom_data = chart_api.get_denom_val(
            "2021-01", test_denom_data)
        assert result_later_than_denom_data == 3
        result_denom_data_no_match = chart_api.get_denom_val(
            "2019-01", test_denom_data)
        assert result_denom_data_no_match == 2
        result_denom_date_less_specific = chart_api.get_denom_val(
            "2018-01-01", test_denom_data)
        assert result_denom_date_less_specific == 2
        result_denom_date_less_specific_no_match = chart_api.get_denom_val(
            "2019-07-01", test_denom_data)
        assert result_denom_date_less_specific_no_match == 2
        result_denom_date_more_specific = chart_api.get_denom_val(
            "2018", test_denom_data)
        assert result_denom_date_more_specific == 2
        result_denom_date_less_specific_no_match = chart_api.get_denom_val(
            "2019", test_denom_data)
        assert result_denom_date_less_specific_no_match == 2


class TestChoroplethData(unittest.TestCase):

    @patch('routes.api.chart.dc_service.get_places_in')
    @patch('routes.api.chart.landing_page_api.get_denom')
    @patch('routes.api.chart.landing_page_api.build_url')
    @patch('routes.api.chart.dc_service.get_stat_set_within_place')
    @patch('routes.api.chart.dc_service.get_stats')
    @patch('routes.api.chart.get_choropleth_display_level')
    @patch('routes.api.chart.get_choropleth_configs')
    @patch('routes.api.chart.get_stat_vars')
    @patch('routes.api.chart.get_denom_val')
    def testRoute(self, mock_denom_val, mock_stat_vars, mock_configs,
                  mock_display_level, mock_stats, mock_stats_within_place,
                  mock_explore_url, mock_denom, mock_places_in):
        test_dcid = 'test_dcid'
        geo1 = 'dcid1'
        geo2 = 'dcid2'
        display_level = "AdministrativeArea1"
        sv1 = 'StatVar1'
        sv2 = 'StatVar2'
        sv3 = 'StatVar3'
        sv1_date1 = '2018'
        sv1_date2 = '2019'
        sv2_date = '2018'
        sv1_val = 2
        sv2_val1 = 4
        sv2_val2 = 6
        source1 = 'source1'
        source2 = 'source2'
        source3 = 'source3'
        scaling_val = 100
        denom_val = 2
        cc1 = {
            'category': ['Test', 'Test2'],
            'title': 'Test2',
            'statsVars': [sv1],
            'isChoropleth': True
        }
        cc2 = {
            'category': ['Test', 'Test2'],
            'title': 'Test2',
            'statsVars': [sv2],
            'isChoropleth': True,
            'relatedChart': {
                'scale': True,
                'denominator': sv3,
                'scaling': scaling_val
            }
        }

        sv_set = {sv1, sv2}
        denoms_set = {sv3}
        chart_configs = [cc1, cc2]
        geos = [geo1, geo2]
        mock_configs.return_value = [cc1, cc2]
        mock_display_level.return_value = test_dcid, display_level

        def places_in_side_effect(*args):
            if args[0] == [test_dcid] and args[1] == display_level:
                return {test_dcid: geos}
            else:
                return {}

        mock_places_in.side_effect = places_in_side_effect

        def stat_vars_side_effect(*args):
            if args[0] == chart_configs:
                return sv_set, denoms_set
            else:
                return {}, {}

        mock_stat_vars.side_effect = stat_vars_side_effect

        stat_within_place = {
            'data': {
                sv1: {
                    'stat': {
                        geo1: {
                            'date': sv1_date1,
                            'value': sv1_val,
                            'metadata': {
                                'importName': 'importName1'
                            }
                        },
                        geo2: {
                            'date': sv1_date2,
                            'value': sv1_val,
                            'metadata': {
                                'importName': 'importName1'
                            }
                        }
                    },
                    'metadata': {
                        'importName1': {
                            'provenanceUrl': source1
                        },
                    }
                },
                sv2: {
                    'stat': {
                        geo1: {
                            'date': sv2_date,
                            'value': sv2_val1,
                            'metadata': {
                                'importName': 'importName1'
                            }
                        },
                        geo2: {
                            'date': sv2_date,
                            'value': sv2_val2,
                            'metadata': {
                                'importName': 'importName2'
                            }
                        }
                    },
                    'metadata': {
                        'importName1': {
                            'provenanceUrl': source1
                        },
                        'importName2': {
                            'provenanceUrl': source2
                        }
                    }
                }
            }
        }

        def stat_within_place_side_effect(*args):
            if args[0] == test_dcid and args[1] == display_level:
                return stat_within_place
            else:
                return {}

        mock_stats_within_place.side_effect = stat_within_place_side_effect

        denom_data = {'2018': 2}
        denom_stat = {
            geo1: {
                'data': denom_data,
                'provenanceUrl': source3
            },
            geo2: {}
        }

        def stat_side_effect(*args):
            if args[0] == geos and args[1] == sv3:
                return denom_stat
            else:
                return {}

        mock_stats.side_effect = stat_side_effect

        def get_denom_side_effect(*args):
            if args[0] == cc2:
                return sv3
            else:
                return None

        mock_denom.side_effect = get_denom_side_effect

        def get_denom_val_side_effect(*args):
            if args[1] == denom_data:
                return denom_val
            else:
                return None

        mock_denom_val.side_effect = get_denom_val_side_effect

        test_url = 'test/url/1'
        test_url2 = 'test/url/2'

        def build_url_side_effect(*args):
            if args[0] == [test_dcid] and args[1] == {sv1: None}:
                return test_url
            elif args[0] == [test_dcid] and args[1] == {
                    sv2: sv3
            } and args[2] == True:
                return test_url2
            else:
                return None

        mock_explore_url.side_effect = build_url_side_effect

        response = app.test_client().get('/api/chart/choroplethdata/' +
                                         test_dcid)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        response_data_sv2_sources = response_data[sv2]['sources']
        assert set(response_data_sv2_sources) == set([source1, source3])
        expected_data = {
            sv1: {
                'date': f'{sv1_date1} to {sv1_date2}',
                'data': {
                    geo1: sv1_val,
                    geo2: sv1_val
                },
                'numDataPoints': 2,
                'exploreUrl': test_url,
                'sources': [source1]
            },
            sv2: {
                'date': sv2_date,
                'data': {
                    geo1: (sv2_val1 / denom_val) * scaling_val
                },
                'numDataPoints': 1,
                'exploreUrl': test_url2,
                'sources': response_data_sv2_sources
            }
        }
        assert response_data == expected_data
