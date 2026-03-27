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
from unittest import mock

import server.tests.routes.api.mock_data as mock_data
from web_app import app


class TestApiStatsProperty(unittest.TestCase):

  @mock.patch('server.services.datacommons.post')
  def test_api_get_stats_property(self, mock_post):

    def side_effect(url, req_json, _=None):
      if req_json == {
          'nodes': ['DifferenceRelativeToBaseDate1990_Temperature'],
          'property': '->*',
          'nextToken': ''
      }:
        return {
            'data': {
                'DifferenceRelativeToBaseDate1990_Temperature': {
                    'arcs': {
                        "baseDate": {
                            "nodes": [{
                                "provenanceId": "dc/base/HumanReadableStatVars",
                                "value": "1990"
                            }]
                        },
                        "constraintProperties": {
                            "nodes": [{
                                "dcid": "baseDate",
                                "name": "baseDate",
                                "provenanceId": "dc/base/HumanReadableStatVars",
                                "types": ["Property"]
                            }]
                        },
                        "measuredProperty": {
                            "nodes": [{
                                "dcid": "temperature",
                                "name": "temperature",
                                "provenanceId": "dc/base/HumanReadableStatVars",
                                "types": ["Property"]
                            }]
                        },
                        "measurementQualifier": {
                            "nodes": [{
                                "dcid": "DifferenceRelativeToBaseDate",
                                "name": "DifferenceRelativeToBaseDate",
                                "provenanceId": "dc/base/HumanReadableStatVars",
                                "types": ["BinaryOperatorEnum"]
                            }]
                        },
                        "memberOf": {
                            "nodes": [{
                                "dcid":
                                    "dc/g/Place_DeltaFromReferenceDate-1990",
                                "name":
                                    "Place With Delta From Reference Date = 1990",
                                "provenanceId":
                                    "dc/base/HumanReadableStatVars",
                                "types": ["StatVarGroup"]
                            }]
                        },
                        "name": {
                            "nodes": [{
                                "provenanceId":
                                    "dc/base/HumanReadableStatVars",
                                "value":
                                    "Temperature (Difference Relative To Base Date): Relative To 1990"
                            }]
                        },
                        "populationType": {
                            "nodes": [{
                                "dcid": "Place",
                                "name": "Place",
                                "provenanceId": "dc/base/HumanReadableStatVars",
                                "types": ["Class"]
                            }]
                        },
                        "provenance": {
                            "nodes": [{
                                "dcid": "dc/base/HumanReadableStatVars",
                                "name": "HumanReadableStatVars",
                                "provenanceId": "dc/base/HumanReadableStatVars",
                                "types": ["Provenance"]
                            }]
                        },
                        "statType": {
                            "nodes": [{
                                "dcid": "measuredValue",
                                "name": "measuredValue",
                                "provenanceId": "dc/base/HumanReadableStatVars",
                                "types": ["Property"]
                            }]
                        },
                        "typeOf": {
                            "nodes": [{
                                "dcid": "StatisticalVariable",
                                "name": "StatisticalVariable",
                                "provenanceId": "dc/base/HumanReadableStatVars",
                                "types": ["Class"]
                            }]
                        }
                    },
                },
            }
        }

    mock_post.side_effect = side_effect
    response = app.test_client().get(
        '/api/stats/stat-var-property?dcids=DifferenceRelativeToBaseDate1990_Temperature'
    )
    assert response.status_code == 200
    assert json.loads(response.data) == {
        'DifferenceRelativeToBaseDate1990_Temperature': {
            "md":
                "",
            "mprop":
                "temperature",
            "mq":
                "DifferenceRelativeToBaseDate",
            "pt":
                "Place",
            "pvs": {
                "baseDate": "1990"
            },
            "ranked":
                False,
            "st":
                "measuredValue",
            "title":
                "Temperature (Difference Relative To Base Date): Relative To 1990",
            "pcAllowed":
                False
        }
    }


class TestSearchStatVar(unittest.TestCase):

  @mock.patch('server.routes.shared_api.stats.is_feature_enabled')
  @mock.patch('server.routes.shared_api.stats.dc.filter_statvars')
  @mock.patch('server.lib.vertex_ai.search')
  def test_search_statvar_vai_enabled(self, mock_vertex_ai_search,
                                      mock_filter_statvars,
                                      mock_is_feature_enabled):
    """Tests behaviour when Vertex AI search is enabled and should be called."""
    expected_query = 'person'
    expected_entities = ["geoId/06"]
    vai_response_page_one = mock_data.VERTEX_AI_STAT_VAR_SEARCH_API_RESPONSE_PAGE_ONE
    vai_response_page_two = mock_data.VERTEX_AI_STAT_VAR_SEARCH_API_RESPONSE_PAGE_TWO
    expected_result_limit_one = mock_data.STAT_VAR_SEARCH_RESPONSE_SV_ONLY
    expected_result_page_one = mock_data.VERTEX_AI_STAT_VAR_SEARCH_RESULT_PAGE_ONE
    expected_result_all = mock_data.VERTEX_AI_STAT_VAR_SEARCH_RESULT_ALL
    expected_result_filtered = mock_data.VERTEX_AI_STAT_VAR_FILTER_RESULT

    def search_vai_side_effect(query, page_token, **kwargs):
      if query == expected_query and not page_token:
        return vai_response_page_one
      elif query == expected_query and page_token == 'page_two':
        return vai_response_page_two
      else:
        return []

    def filter_statvars_side_effect(stat_vars, entities):
      if entities == []:
        return {'statVars': stat_vars}
      elif entities == expected_entities:
        return expected_result_filtered
      else:
        return {}

    with app.app_context():
      mock_is_feature_enabled.return_value = True
      mock_vertex_ai_search.side_effect = search_vai_side_effect
      mock_filter_statvars.side_effect = filter_statvars_side_effect

      response = app.test_client().get(
          'api/stats/stat-var-search?query=person&limit=1')
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_result_limit_one

      response = app.test_client().get(
          'api/stats/stat-var-search?query=person&limit=3')
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_result_page_one

      response = app.test_client().get(
          'api/stats/stat-var-search?query=person&limit=10')
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_result_all

      response = app.test_client().get(
          'api/stats/stat-var-search?query=person&entities=geoId/06')
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_result_filtered

  @mock.patch('server.routes.shared_api.stats.is_feature_enabled')
  @mock.patch('server.routes.shared_api.stats.dc.filter_statvars')
  @mock.patch('server.lib.vertex_ai.search')
  def test_search_statvar_vai_missing_data(self, mock_vertex_ai_search,
                                           mock_filter_statvars,
                                           mock_is_feature_enabled):
    """Tests behaviour when Vertex AI search is enabled and returns incomplete StatVar data."""
    expected_query = 'person'
    vai_response = mock_data.VERTEX_AI_STAT_VAR_SEARCH_API_RESPONSE_MISSING_DATA
    expected_result = mock_data.STAT_VAR_SEARCH_RESPONSE_SV_ONLY

    def search_vai_side_effect(query, page_token, **kwargs):
      if query == expected_query and not page_token:
        return vai_response
      else:
        return []

    def filter_statvars_side_effect(stat_vars, _):
      return {'statVars': stat_vars}

    with app.app_context(), self.assertLogs(level='WARNING') as cm:
      mock_is_feature_enabled.return_value = True
      mock_vertex_ai_search.side_effect = search_vai_side_effect
      mock_filter_statvars.side_effect = filter_statvars_side_effect

      response = app.test_client().get('api/stats/stat-var-search?query=person')
      self.assertEqual(len(cm.output), 2)
      self.assertEqual(cm.records[0].levelname, 'WARNING')
      self.assertEqual(
          cm.records[0].message,
          'There\'s an issue with DCID or name for the stat var search result: {\'name\': \'sv2\'}'
      )
      self.assertEqual(cm.records[1].levelname, 'WARNING')
      self.assertEqual(
          cm.records[1].message,
          'There\'s an issue with DCID or name for the stat var search result: {\'dcid\': \'sv3\'}'
      )
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_result

  @mock.patch('server.routes.shared_api.stats.dc.post')
  @mock.patch('server.routes.shared_api.stats.dc.v2node')
  @mock.patch('server.routes.shared_api.stats.is_feature_enabled')
  def test_search_statvar_custom_dc_v2_fallback(self, mock_is_feature_enabled,
                                                mock_v2node, mock_post):
    """Tests the /v2 fallback for custom Data Commons when VAI is disabled."""
    mock_is_feature_enabled.return_value = False

    def post_side_effect(url, req_json):
      if "/v2/resolve" in url:
        return {
            "entities": [{
                "candidates": [{
                    "dcid": "Count_Person"
                }, {
                    "dcid": "dc/g/Demographics"
                }]
            }]
        }
      elif "/v2/observation" in url:
        # Count_Person has data, dc/g/Demographics does not
        return {"byVariable": {"Count_Person": {"byEntity": {"geoId/06": {}}}}}
      elif "/v2/node" in url:
        # Count_Person is StatisticalVariable, dc/g/Demographics is StatVarGroup
        return {
            "data": {
                "Count_Person": {
                    "arcs": {
                        "typeOf": {
                            "nodes": [{
                                "dcid": "StatisticalVariable"
                            },]
                        }
                    }
                },
                "dc/g/Demographics": {
                    "arcs": {
                        "typeOf": {
                            "nodes": [{
                                "dcid": "StatVarGroup"
                            }]
                        }
                    }
                }
            }
        }
      return {}

    mock_post.side_effect = post_side_effect
    mock_v2node.return_value = {
        "data": {
            "Count_Person": {
                "arcs": {
                    "name": {
                        "nodes": [{
                            "value": "Population"
                        }]
                    }
                }
            }
        }
    }

    original_enable_model = app.config.get('ENABLE_MODEL')
    original_custom = app.config.get('CUSTOM')
    app.config['ENABLE_MODEL'] = True
    app.config['CUSTOM'] = True

    try:
      with app.app_context():
        # Test with entities (filters by observation)
        response = app.test_client().get(
            'api/stats/stat-var-search?query=person&entities=geoId/06')
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result == {
            "statVars": [{
                "dcid": "Count_Person",
                "name": "Population"
            }],
            "matches": [],
            "statVarGroups": []
        }

        # Test without entities (skips observation check)
        response = app.test_client().get(
            'api/stats/stat-var-search?query=person')
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result == {
            "statVars": [{
                "dcid": "Count_Person",
                "name": "Population"
            }],
            "matches": [],
            "statVarGroups": []
        }

    finally:
      app.config['ENABLE_MODEL'] = original_enable_model
      app.config['CUSTOM'] = original_custom
