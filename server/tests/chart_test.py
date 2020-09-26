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


class TestBuildConfig(unittest.TestCase):
    chart_config = [{
        'category': ['Economics', 'Unemployment'],
        'title': 'Unemployment Rate',
        'statsVars': ['UnemploymentRate_Person'],
        'isOverview': True
    }, {
        'category': ['Economics', 'Unemployment'],
        'title': 'Labor Force Participation',
        'statsVars': ['Count_Person_InLaborForce'],
        'perCapita': True,
        'scaling': 100,
        'unit': '%',
    }]
    result = chart_api.build_config(chart_config)
    with open('tests/test_data/golden_config.json') as f:
        expected = json.load(f)
        assert expected == result


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
