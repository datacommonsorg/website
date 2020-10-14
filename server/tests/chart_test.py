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
    @patch('routes.api.chart.dc_service.get_places_in')
    @patch('routes.api.chart.place_api.get_place_type')
    def test_get_choropleth_places_has_display_level(self, mock_place_type,
                                                     mock_places_in,
                                                     mock_parents):
        dcid = "test_dcid1"
        expected = ["dcid1", "dcid2"]

        def get_places_in_(*args):
            if args[0] == [dcid] and args[1] == "AdministrativeArea1":
                return {dcid: expected}
            else:
                return {dcid: []}

        mock_place_type.return_value = "Country"
        mock_places_in.side_effect = get_places_in_
        result = chart_api.get_choropleth_places(dcid)
        assert result == (expected, "geoJsonCoordinatesDP3")

    @patch('routes.api.chart.place_api.parent_places')
    @patch('routes.api.chart.dc_service.get_places_in')
    @patch('routes.api.chart.place_api.get_place_type')
    def test_get_choropleth_places_equivalent_has_display_level(
            self, mock_place_type, mock_places_in, mock_parents):
        dcid = "test_dcid2"
        expected = ["dcid1", "dcid2"]

        def get_places_in_(*args):
            if args[0] == [dcid] and args[1] == "AdministrativeArea2":
                return {dcid: expected}
            else:
                return {dcid: []}

        mock_place_type.return_value = "AdministrativeArea1"
        mock_places_in.side_effect = get_places_in_
        result = chart_api.get_choropleth_places(dcid)
        assert result == (expected, "geoJsonCoordinatesDP2")

    @patch('routes.api.chart.place_api.parent_places')
    @patch('routes.api.chart.dc_service.get_places_in')
    @patch('routes.api.chart.place_api.get_place_type')
    def test_get_choropleth_places_has_no_display_level(self, mock_place_type,
                                                        mock_places_in,
                                                        mock_parents):
        dcid = "test_dcid3"
        parent_dcid = "parent_dcid"

        def get_places_in_(*args):
            if args[0] == [dcid] and args[1] == "AdministrativeArea1":
                return {dcid: ["dcid1", "dcid2"]}
            elif args[0] == [dcid] and args[1] == "AdministrativeArea2":
                return {dcid: ["dcid1", "dcid2"]}
            elif args[0] == [parent_dcid] and args[1] == "AdministrativeArea1":
                return {dcid: ["dcid1", "dcid2"]}
            elif args[0] == [parent_dcid] and args[1] == "AdministrativeArea2":
                return {dcid: ["dcid1", "dcid2"]}
            else:
                return {dcid: []}

        mock_place_type.return_value = "County"
        mock_places_in.side_effect = get_places_in_
        mock_parents.return_value = mock_parents.return_value = {
            dcid: [{
                'dcid': parent_dcid,
                'types': ['Country']
            }]
        }
        result = chart_api.get_choropleth_places(dcid)
        assert result == []

    @patch('routes.api.chart.place_api.parent_places')
    @patch('routes.api.chart.dc_service.get_places_in')
    @patch('routes.api.chart.place_api.get_place_type')
    def test_get_choropleth_places_parent_places(self, mock_place_type,
                                                 mock_places_in, mock_parents):
        dcid = "test_dcid4"
        parent_dcid = "parent_dcid"
        expected = ["dcid1", "dcid2"]

        def get_places_in_(*args):
            if args[0] == [parent_dcid] and args[1] == "AdministrativeArea1":
                return {parent_dcid: ["dcid1", "dcid3"]}
            elif args[0] == [parent_dcid] and args[1] == "AdministrativeArea2":
                return {parent_dcid: expected}
            else:
                return {dcid: []}

        mock_place_type.return_value = "County"
        mock_places_in.side_effect = get_places_in_
        mock_parents.return_value = {
            dcid: [{
                'dcid': parent_dcid,
                'types': ['AdministrativeArea1']
            }]
        }
        result = chart_api.get_choropleth_places(dcid)
        assert result == (expected, "geoJsonCoordinatesDP2")

    @patch('routes.api.chart.place_api.parent_places')
    @patch('routes.api.chart.dc_service.get_places_in')
    @patch('routes.api.chart.place_api.get_place_type')
    def test_get_choropleth_places_parent_has_equivalent(
            self, mock_place_type, mock_places_in, mock_parents):
        dcid = "test_dcid5"
        parent_dcid = "parent_dcid"
        expected = ["dcid1", "dcid2"]

        def get_places_in_(*args):
            if args[0] == [parent_dcid] and args[1] == "AdministrativeArea1":
                return {parent_dcid: ["dcid1", "dcid3"]}
            elif args[0] == [parent_dcid] and args[1] == "AdministrativeArea2":
                return {parent_dcid: expected}
            else:
                return {dcid: []}

        mock_place_type.return_value = "County"
        mock_places_in.side_effect = get_places_in_
        mock_parents.return_value = {
            dcid: [{
                'dcid': parent_dcid,
                'types': ['State']
            }]
        }
        result = chart_api.get_choropleth_places(dcid)
        assert result == (expected, "geoJsonCoordinatesDP2")

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
            mock_places.return_value = [dcid1, dcid2], "geoJsonProp"
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
        cc4 = {
            'category': ['Test', 'Test2'],
            'title': 'Test2',
            'statsVars': ['StatVar4'],
            'isChoropleth': True,
            'relatedChart': {
                'scale': True,
                'denominator': 'Test_Denominator'
            }
        }
        cc5 = {
            'category': ['Test', 'Test2'],
            'title': 'Test2',
            'statsVars': ['StatVar5'],
            'denominator': ['StatVar6'],
            'isChoropleth': True
        }
        cc6 = {
            'category': ['Test', 'Test2'],
            'title': 'Test2',
            'statsVars': ['StatVar7'],
            'isChoropleth': True,
            'relatedChart': {
                'scale': True
            }
        }
        cc7 = {
            'category': ['Test', 'Test2'],
            'title': 'Test2',
            'statsVars': ['StatVar8'],
            'isChoropleth': True,
            'relatedChart': {
                'scale': False
            }
        }

        with app.app_context():
            app.config['CHART_CONFIG'] = [cc1, cc2, cc3, cc4, cc5, cc6, cc7]
            expected_sv_set = {
                'StatVar3', 'StatVar4', 'StatVar5', 'StatVar6', 'StatVar7',
                'StatVar8', 'Count_Person', 'Test_Denominator'
            }
            expected_chart_configs = [cc3, cc4, cc5, cc6, cc7]
            actual_sv_set, actual_chart_configs = chart_api.get_choropleth_sv()
            assert expected_sv_set == actual_sv_set
            assert expected_chart_configs == actual_chart_configs

    def test_process_choropleth_data(self):
        source_series_1_vals = {'2019': 1, '2018': 2, '2017': 3}
        source_series_1_source = 'provDomain1'
        source_series_1 = {
            'val': source_series_1_vals,
            'provenanceDomain': source_series_1_source
        }
        source_series_2_vals = {'2018': 1, '2013': 2}
        source_series_2_source = 'provDomain2'
        source_series_2 = {
            'val': source_series_2_vals,
            'provenanceDomain': source_series_2_source
        }
        test_data = {
            'dcid1': {
                'statVarData': {
                    'SV1': {
                        'sourceSeries': [source_series_1, source_series_2]
                    },
                    'SV2': {},
                    'SV3': {
                        'sourceSeries': [source_series_2]
                    },
                }
            }
        }
        expected_result = {
            'dcid1': {
                'SV1': {
                    'data': source_series_1_vals,
                    'provenanceDomain': source_series_1_source
                },
                'SV3': {
                    'data': source_series_2_vals,
                    'provenanceDomain': source_series_2_source
                }
            }
        }
        actual_result = chart_api.process_choropleth_data(test_data)


class TestChoroplethData(unittest.TestCase):

    @patch('routes.api.chart.landing_page_api.build_url')
    @patch('routes.api.chart.landing_page_api.get_snapshot_across_places')
    @patch('routes.api.chart.process_choropleth_data')
    @patch('routes.api.chart.dc_service.get_stats_all')
    @patch('routes.api.chart.get_choropleth_places')
    @patch('routes.api.chart.get_choropleth_sv')
    def testRoute(self, mock_choropleth_sv, mock_choropleth_places,
                  mock_all_stats, mock_process_data, mock_snapshot_data,
                  mock_explore_url):
        test_dcid = 'test_dcid'
        geo1 = 'dcid1'
        geo2 = 'dcid2'
        sv1 = 'StatVar1'
        sv2 = 'StatVar2'
        sv3 = 'StatVar3'
        sv1_date = 'date1'
        sv2_date = 'date2'
        sv1_val1 = 1
        sv1_val2 = 2
        sv2_val1 = 3
        sv1_sources = ['source1']
        sv2_sources = ['source1', 'source2']
        scalingVal = 100
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
                'scaling': scalingVal
            }
        }
        sv_set = {sv1, sv2, sv3}
        chart_configs = [cc1, cc2]
        geos = [geo1, geo2]
        mock_choropleth_sv.return_value = sv_set, chart_configs
        mock_choropleth_places.return_value = geos, "geoJsonCoordinatesDP3"
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

        def process_data_side_effect(*args):
            if args[0] == stats_all_return_value:
                return stats_all_return_value
            else:
                return {}

        mock_process_data.side_effect = process_data_side_effect

        cc1_snapshot_data = {
            'date': sv1_date,
            'data': [{
                'dcid': geo1,
                'data': {
                    sv1: sv1_val1
                }
            }, {
                'dcid': geo2,
                'data': {
                    sv1: sv1_val2
                }
            }],
            'sources': sv1_sources
        }

        cc2_snapshot_data = {
            'date': sv2_date,
            'data': [{
                'dcid': geo1,
                'data': {
                    sv2: sv2_val1
                }
            }],
            'sources': sv2_sources
        }

        def snapshot_data_side_effect(*args):
            if args[0] == cc1 and args[1] == stats_all_return_value and args[
                    2] == geos:
                return cc1_snapshot_data, {'sv1': None}
            elif args[0] == cc2 and args[1] == stats_all_return_value and args[
                    2] == geos:
                return cc2_snapshot_data, {'sv2': None}
            else:
                return None

        mock_snapshot_data.side_effect = snapshot_data_side_effect

        test_url = 'test/url/1'
        test_url2 = 'test/url/2'

        def build_url_side_effect(*args):
            if args[0] == [test_dcid] and args[1] == {'sv1': None}:
                return test_url
            elif args[0] == [test_dcid] and args[1] == {
                    'sv2': None
            } and args[2] == True:
                return test_url2
            else:
                return None

        mock_explore_url.side_effect = build_url_side_effect

        response = app.test_client().get('/api/chart/choroplethdata/' +
                                         test_dcid)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        expected_data = {
            sv1: {
                'date': sv1_date,
                'data': {
                    geo1: sv1_val1,
                    geo2: sv1_val2
                },
                'numDataPoints': 2,
                'exploreUrl': test_url,
                'sources': sv1_sources
            },
            sv2: {
                'date': sv2_date,
                'data': {
                    geo1: sv2_val1 * scalingVal
                },
                'numDataPoints': 1,
                'exploreUrl': test_url2,
                'sources': sv2_sources
            }
        }
        assert response_data == expected_data
