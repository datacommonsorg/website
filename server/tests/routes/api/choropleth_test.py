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

import gzip
import json
import unittest
from unittest.mock import patch

import server.lib.shared as shared_api
import server.routes.shared_api.choropleth as choropleth_api
from web_app import app

GEOJSON_MULTIPOLYGON_GEOMETRY = {
    "coordinates": [[[[180.0, 40.0], [180.0, 50.0], [170.0, 50.0],
                      [170.0, 40.0], [180.0, 40.0]]],
                    [[[-170.0, 40.0], [-170.0, 50.0], [-180.0, 50.0],
                      [-180.0, 40.0], [-170.0, 40.0]]]],
    "type": "MultiPolygon"
}
GEOJSON_POLYGON_GEOMETRY = {
    "coordinates": [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0],
                     [100.0, 0.0]]],
    "type": "Polygon"
}
GEOJSON_MULTILINE_GEOMETRY = {
    "coordinates": [[[170.0, 45.0], [180.0, 45.0]],
                    [[-180.0, 45.0], [-170.0, 45.0]]],
    "type": "MultiLineString"
}


class TestChoroplethPlaces(unittest.TestCase):

  @patch('server.routes.shared_api.choropleth.place_api.parent_places')
  @patch('server.routes.shared_api.choropleth.place_api.get_place_type')
  def test_get_choropleth_display_level_has_display_level(
      self, mock_place_type, mock_parents):
    dcid = "test_dcid1"

    mock_place_type.return_value = "Country"
    result = choropleth_api.get_choropleth_display_level(dcid)
    assert result == (dcid, "AdministrativeArea1")

  @patch('server.routes.shared_api.choropleth.place_api.parent_places')
  @patch('server.routes.shared_api.choropleth.place_api.get_place_type')
  def test_get_choropleth_display_level_equivalent_has_display_level(
      self, mock_place_type, mock_parents):
    dcid = "test_dcid2"

    mock_place_type.return_value = "AdministrativeArea1"
    result = choropleth_api.get_choropleth_display_level(dcid)
    assert result == (dcid, "AdministrativeArea2")

  @patch('server.routes.shared_api.choropleth.place_api.parent_places')
  @patch('server.routes.shared_api.choropleth.place_api.get_place_type')
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
    result = choropleth_api.get_choropleth_display_level(dcid)
    assert result == (None, None)

  @patch('server.routes.shared_api.choropleth.place_api.parent_places')
  @patch('server.routes.shared_api.choropleth.place_api.get_place_type')
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
    result = choropleth_api.get_choropleth_display_level(dcid)
    assert result == (parent_dcid, "County")

  @patch('server.routes.shared_api.choropleth.place_api.parent_places')
  @patch('server.routes.shared_api.choropleth.place_api.get_place_type')
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
    result = choropleth_api.get_choropleth_display_level(dcid)
    assert result == (parent_dcid, "County")


class TestGetGeoJson(unittest.TestCase):

  @staticmethod
  def side_effect(*args):
    return args[0]

  @patch('server.routes.shared_api.choropleth.fetch.descendent_places')
  @patch('server.routes.shared_api.choropleth.rewind')
  @patch('server.routes.shared_api.choropleth.fetch.property_values')
  @patch('server.routes.shared_api.choropleth.place_api.get_display_name')
  @patch('server.routes.shared_api.choropleth.get_choropleth_display_level')
  def test_get_geojson(self, mock_display_level, mock_display_name,
                       mock_geojson_values, mock_rewind_geojson, mock_places):
    dcid1 = "dcid1"
    dcid2 = "dcid2"
    parentDcid = "parentDcid"
    mock_display_level.return_value = (parentDcid, "State")

    def descendent_places_(*args):
      if args[0] == [parentDcid] and args[1] == "State":
        return {parentDcid: [dcid1, dcid2]}
      else:
        return None

    mock_places.side_effect = descendent_places_
    mock_display_name.return_value = {dcid1: dcid1, dcid2: dcid2}
    mock_geojson_values.return_value = {
        dcid1: [json.dumps(GEOJSON_POLYGON_GEOMETRY)],
        dcid2: [json.dumps(GEOJSON_MULTIPOLYGON_GEOMETRY)]
    }
    mock_rewind_geojson.side_effect = self.side_effect
    response = app.test_client().get(
        f'/api/choropleth/geojson?placeDcid={parentDcid}')
    assert response.status_code == 200
    response_data = json.loads(gzip.decompress(response.data))
    assert response_data == {
        'type': 'FeatureCollection',
        'features': [{
            'type': 'Feature',
            'id': 'dcid1',
            'properties': {
                'name': 'dcid1',
                'geoDcid': 'dcid1'
            },
            'geometry': {
                'type':
                    'MultiPolygon',
                'coordinates': [[[[100.0, 0.0], [100.0, 1.0], [101.0, 1.0],
                                  [101.0, 0.0], [100.0, 0.0]]]]
            }
        }, {
            'type': 'Feature',
            'id': 'dcid2',
            'properties': {
                'name': 'dcid2',
                'geoDcid': 'dcid2'
            },
            'geometry': {
                'type':
                    'MultiPolygon',
                'coordinates': [[[[180.0, 40.0], [170.0, 40.0], [170.0, 50.0],
                                  [180.0, 50.0], [180.0, 40.0]]],
                                [[[-170.0, 40.0], [-180.0,
                                                   40.0], [-180.0, 50.0],
                                  [-170.0, 50.0], [-170.0, 40.0]]]]
            }
        }],
        'properties': {
            'current_geo': 'parentDcid'
        }
    }

  @patch('server.routes.shared_api.choropleth.fetch.descendent_places')
  @patch('server.routes.shared_api.choropleth.rewind')
  @patch('server.routes.shared_api.choropleth.fetch.property_values')
  @patch('server.routes.shared_api.choropleth.place_api.get_display_name')
  def test_get_geojson_with_place_type(self, mock_display_name,
                                       mock_geojson_values, mock_rewind_geojson,
                                       mock_places):
    dcid1 = "dcid1"
    dcid2 = "dcid2"
    parentDcid = "parentDcid"

    def descendent_places_(*args):
      if args[0] == [parentDcid] and args[1] == "State":
        return {parentDcid: [dcid1, dcid2]}
      else:
        return None

    mock_places.side_effect = descendent_places_
    mock_display_name.return_value = {dcid1: dcid1, dcid2: dcid2}
    mock_geojson_values.return_value = {
        dcid1: [json.dumps(GEOJSON_POLYGON_GEOMETRY)],
        dcid2: [json.dumps(GEOJSON_MULTIPOLYGON_GEOMETRY)]
    }
    mock_rewind_geojson.side_effect = self.side_effect
    response = app.test_client().get(
        f'/api/choropleth/geojson?placeDcid={parentDcid}&placeType=State')
    assert response.status_code == 200
    response_data = json.loads(gzip.decompress(response.data))
    assert response_data == {
        'type': 'FeatureCollection',
        'features': [{
            'type': 'Feature',
            'id': 'dcid1',
            'properties': {
                'name': 'dcid1',
                'geoDcid': 'dcid1'
            },
            'geometry': {
                'type':
                    'MultiPolygon',
                'coordinates': [[[[100.0, 0.0], [100.0, 1.0], [101.0, 1.0],
                                  [101.0, 0.0], [100.0, 0.0]]]]
            }
        }, {
            'type': 'Feature',
            'id': 'dcid2',
            'properties': {
                'name': 'dcid2',
                'geoDcid': 'dcid2'
            },
            'geometry': {
                'type':
                    'MultiPolygon',
                'coordinates': [[[[180.0, 40.0], [170.0, 40.0], [170.0, 50.0],
                                  [180.0, 50.0], [180.0, 40.0]]],
                                [[[-170.0, 40.0], [-180.0,
                                                   40.0], [-180.0, 50.0],
                                  [-170.0, 50.0], [-170.0, 40.0]]]]
            }
        }],
        'properties': {
            'current_geo': 'parentDcid'
        }
    }


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
      actual_chart_configs = choropleth_api.get_choropleth_configs()
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
    actual_sv_set, actual_denom_set = shared_api.get_stat_vars(
        [cc1, cc2, cc3, cc4])
    assert expected_sv_set == actual_sv_set
    assert expected_denom_set == actual_denom_set

  def test_get_denom_val(self):
    test_denom_data = [
        {
            'date': '2017-01',
            'value': 1
        },
        {
            'date': '2018-01',
            'value': 2
        },
        {
            'date': '2020-01',
            'value': 3
        },
    ]
    result_in_denom_data = choropleth_api.get_denom_val("2018-01",
                                                        test_denom_data)
    assert result_in_denom_data == 2
    result_earlier_than_denom_data = choropleth_api.get_denom_val(
        "2016-01", test_denom_data)
    assert result_earlier_than_denom_data == 1
    result_later_than_denom_data = choropleth_api.get_denom_val(
        "2021-01", test_denom_data)
    assert result_later_than_denom_data == 3
    result_denom_data_no_match = choropleth_api.get_denom_val(
        "2019-01", test_denom_data)
    assert result_denom_data_no_match == 2
    result_denom_date_less_specific = choropleth_api.get_denom_val(
        "2018-01-01", test_denom_data)
    assert result_denom_date_less_specific == 2
    result_denom_date_less_specific_no_match = choropleth_api.get_denom_val(
        "2019-07-01", test_denom_data)
    assert result_denom_date_less_specific_no_match == 3
    result_denom_date_more_specific = choropleth_api.get_denom_val(
        "2018", test_denom_data)
    assert result_denom_date_more_specific == 2
    result_denom_date_less_specific_no_match = choropleth_api.get_denom_val(
        "2019", test_denom_data)
    assert result_denom_date_less_specific_no_match == 2

  def test_get_date_range(self):
    test_single_date = {"2019"}
    single_date_result = shared_api.get_date_range(test_single_date)
    assert single_date_result == "2019"
    test_multiple_dates = {"2019", "2018", "2017"}
    multiple_date_result = shared_api.get_date_range(test_multiple_dates)
    assert multiple_date_result == "2017 – 2019"
    test_empty_dates = {}
    empty_date_result = shared_api.get_date_range(test_empty_dates)
    assert empty_date_result == ""
    test_empty_valid_dates = {""}
    empty_valid_date_result = shared_api.get_date_range(test_empty_valid_dates)
    assert empty_valid_date_result == ""


class TestChoroplethData(unittest.TestCase):

  @patch('server.routes.shared_api.choropleth.fetch.descendent_places')
  @patch('server.routes.shared_api.choropleth.fetch.point_within_core')
  @patch('server.routes.shared_api.choropleth.fetch.series_core')
  @patch('server.routes.shared_api.choropleth.get_choropleth_display_level')
  @patch('server.routes.shared_api.choropleth.get_choropleth_configs')
  @patch('server.routes.shared_api.choropleth.shared.get_stat_vars')
  def testRoute(self, mock_stat_vars, mock_configs, mock_display_level,
                mock_denom_data, mock_num_data, mock_descendent_places):
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

    def descendent_places_side_effect(*args):
      if args[0] == [test_dcid] and args[1] == display_level:
        return {test_dcid: geos}
      else:
        return {}

    mock_descendent_places.side_effect = descendent_places_side_effect

    def stat_vars_side_effect(*args):
      if args[0] == chart_configs:
        return sv_set, denoms_set
      else:
        return {}, {}

    mock_stat_vars.side_effect = stat_vars_side_effect

    num_api_resp = {
        'data': {
            sv1: {
                geo1: {
                    'date': sv1_date1,
                    'value': sv1_val,
                    'facet': "facet1",
                },
                geo2: {
                    'date': sv1_date2,
                    'value': sv1_val,
                    'facet': "facet1",
                }
            },
            sv2: {
                geo1: {
                    'date': sv2_date,
                    'value': sv2_val1,
                    'facet': "facet1",
                },
                geo2: {
                    'date': sv2_date,
                    'value': sv2_val2,
                    'facet': "facet2",
                }
            }
        },
        'facets': {
            'facet1': {
                'importName': 'importName1',
                'provenanceUrl': source1
            },
            'facet2': {
                'importName': 'importName2',
                'provenanceUrl': source2
            }
        }
    }

    def num_data_side_effect(*args):
      if args[0] == test_dcid and args[1] == display_level:
        return num_api_resp
      else:
        return {}

    mock_num_data.side_effect = num_data_side_effect

    denom_api_resp = {
        'data': {
            sv3: {
                geo1: {
                    'series': [{
                        'date': '2018',
                        'value': 2,
                    }],
                    'facet': 'facet3'
                },
                geo2: {}
            },
        },
        'facets': {
            'facet3': {
                'importName': 'importName3',
                'provenanceUrl': source3
            },
        }
    }

    def denom_data_side_effect(*args):
      if args[0] == geos and args[1] == [sv3]:
        return denom_api_resp
      else:
        return {}

    mock_denom_data.side_effect = denom_data_side_effect

    response = app.test_client().get('/api/choropleth/data/' + test_dcid)
    assert response.status_code == 200
    response_data = json.loads(response.data)
    expected_data = {
        sv1: {
            'date':
                f'{sv1_date1} – {sv1_date2}',
            'data': {
                geo1: sv1_val,
                geo2: sv1_val
            },
            'numDataPoints':
                2,
            'exploreUrl':
                "/tools/map#&pd=test_dcid&ept=AdministrativeArea1&sv=StatVar1",
            'sources': [source1]
        },
        sv2: {
            'date':
                sv2_date,
            'data': {
                geo1: (sv2_val1 / denom_val) * scaling_val
            },
            'numDataPoints':
                1,
            'exploreUrl':
                "/tools/map#&pd=test_dcid&ept=AdministrativeArea1&sv=StatVar2&pc=1",
            'sources': [source1, source3]
        }
    }
    assert response_data == expected_data


class TestGetNodeGeoJson(unittest.TestCase):

  @patch('server.routes.shared_api.choropleth.rewind')
  @patch('server.routes.shared_api.choropleth.fetch.property_values')
  def test_get_geojson(self, mock_geojson_values, mock_geojson_rewind):
    dcid1 = "dcid1"
    dcid2 = "dcid2"
    dcid3 = "dcid3"
    dcid4 = "dcid4"
    dcid5 = "dcid5"
    geojson_prop = "geoJsonProp"
    test_geojson_1 = json.dumps(GEOJSON_POLYGON_GEOMETRY)
    test_geojson_2 = json.dumps(GEOJSON_MULTIPOLYGON_GEOMETRY)
    test_geojson_3 = json.dumps(GEOJSON_MULTILINE_GEOMETRY)

    def geojson_side_effect(nodes, prop):
      if nodes == [dcid1, dcid2, dcid3, dcid4, dcid5] and prop == geojson_prop:
        return {
            dcid1: [test_geojson_1, test_geojson_2],
            dcid2: [test_geojson_1],
            dcid3: [test_geojson_2],
            dcid4: [],
            dcid5: [test_geojson_3]
        }
      else:
        return None

    mock_geojson_values.side_effect = geojson_side_effect

    def geojson_rewind_side_effect(geojson):
      return geojson

    mock_geojson_rewind.side_effect = geojson_rewind_side_effect

    response = app.test_client().post(
        '/api/choropleth/node-geojson',
        json={
            "nodes": [dcid1, dcid2, dcid3, dcid4, dcid5],
            "geoJsonProp": geojson_prop
        })
    assert response.status_code == 200
    response_data = json.loads(response.data)
    assert response_data == {
        'type': 'FeatureCollection',
        'features': [{
            'type': 'Feature',
            'id': 'dcid1',
            'properties': {
                'name': 'dcid1',
                'geoDcid': 'dcid1'
            },
            'geometry': {
                'type':
                    'MultiPolygon',
                'coordinates': [[[[100.0, 0.0], [100.0, 1.0], [101.0, 1.0],
                                  [101.0, 0.0], [100.0, 0.0]]]]
            }
        }, {
            'type': 'Feature',
            'id': 'dcid2',
            'properties': {
                'name': 'dcid2',
                'geoDcid': 'dcid2'
            },
            'geometry': {
                'type':
                    'MultiPolygon',
                'coordinates': [[[[100.0, 0.0], [100.0, 1.0], [101.0, 1.0],
                                  [101.0, 0.0], [100.0, 0.0]]]]
            }
        }, {
            'type': 'Feature',
            'id': 'dcid3',
            'properties': {
                'name': 'dcid3',
                'geoDcid': 'dcid3'
            },
            'geometry': {
                'type':
                    'MultiPolygon',
                'coordinates': [[[[180.0, 40.0], [170.0, 40.0], [170.0, 50.0],
                                  [180.0, 50.0], [180.0, 40.0]]],
                                [[[-170.0, 40.0], [-180.0,
                                                   40.0], [-180.0, 50.0],
                                  [-170.0, 50.0], [-170.0, 40.0]]]]
            }
        }, {
            'type': 'Feature',
            'id': 'dcid5',
            'properties': {
                'name': 'dcid5',
                'geoDcid': 'dcid5'
            },
            'geometry': {
                'coordinates': [[[170.0, 45.0], [180.0, 45.0]],
                                [[-180.0, 45.0], [-170.0, 45.0]]],
                'type': 'MultiLineString'
            }
        }],
        'properties': {
            'current_geo': ''
        }
    }
