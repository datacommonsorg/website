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
  @mock.patch('server.routes.shared_api.stats.dc.search_statvar')
  @mock.patch('server.routes.shared_api.stats.dc.filter_statvars')
  @mock.patch('server.routes.shared_api.stats.search_vertexai')
  def test_search_statvar_dc_single_token_vai_disabled(self,
                                                       mock_search_vertexai, mock_filter_statvars,
                                                       mock_search_dc,
                                                       mock_is_feature_enabled):
    """Tests behaviour when Vertex AI search is disabled."""
    expected_query = 'person'
    expected_places = ["geoId/06"]
    expected_result = mock_data.DC_STAT_VAR_SEARCH_RESPONSE_SVG
    expected_sv_only_result = mock_data.STAT_VAR_SEARCH_RESPONSE_SV_ONLY
    expected_no_places_result = mock_data.DC_STAT_VAR_SEARCH_RESPONSE_NO_PLACES

    def search_dc_side_effect(query, places, sv_only):
      if query == expected_query and places == expected_places and not sv_only:
        return expected_result
      elif query == expected_query and places == expected_places and sv_only:
        return expected_sv_only_result
      elif query == expected_query and places == [] and not sv_only:
        return expected_no_places_result
      else:
        return []

    with app.app_context():
      mock_is_feature_enabled.return_value = False
      mock_search_vertexai.side_effect = ValueError(
          "Vertex AI search not expected in this test.")
      mock_filter_statvars.side_effect = ValueError(
          "dc.filter_statvars not expected in this test.")
      mock_search_dc.side_effect = search_dc_side_effect

      response = app.test_client().get(
          'api/stats/stat-var-search?query=person&places=geoId/06')
      mock_search_vertexai.assert_not_called()
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_result
      response = app.test_client().get(
          'api/stats/stat-var-search?query=person&places=geoId/06&svOnly=1')
      mock_search_vertexai.assert_not_called()
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_sv_only_result
      response = app.test_client().get('api/stats/stat-var-search?query=person')
      mock_search_vertexai.assert_not_called()
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_no_places_result

  @mock.patch('server.routes.shared_api.stats.is_feature_enabled')
  @mock.patch('server.routes.shared_api.stats.dc.search_statvar')
  @mock.patch('server.routes.shared_api.stats.dc.filter_statvars')
  @mock.patch('server.routes.shared_api.stats.search_vertexai')
  def test_search_statvar_vai_enabled(self, mock_search_vertexai, mock_filter_statvars,
                                      mock_search_dc, mock_is_feature_enabled):
    """Tests behaviour when Vertex AI search is enabled and should be called."""
    # TODO: Add test cases for place filtering

    expected_query = 'person'
    vai_response_page_one = mock_data.VERTEX_AI_STAT_VAR_SEARCH_API_RESPONSE_PAGE_ONE
    vai_response_page_two = mock_data.VERTEX_AI_STAT_VAR_SEARCH_API_RESPONSE_PAGE_TWO
    expected_result_limit_one = mock_data.STAT_VAR_SEARCH_RESPONSE_SV_ONLY
    expected_result_page_one = mock_data.VERTEX_AI_STAT_VAR_SEARCH_RESULT_PAGE_ONE
    expected_result_all = mock_data.VERTEX_AI_STAT_VAR_SEARCH_RESULT_ALL

    def search_vai_side_effect(query, token, _=None):
      if query == expected_query and not token:
        return vai_response_page_one
      elif query == expected_query and token == 'page_two':
        return vai_response_page_two
      else:
        return []
      
    def filter_statvars_side_effect(stat_vars, _):
      return {'statVars': stat_vars}

    with app.app_context():
      mock_is_feature_enabled.return_value = True
      mock_search_vertexai.side_effect = search_vai_side_effect
      mock_filter_statvars.side_effect = filter_statvars_side_effect
      mock_search_dc.side_effect = ValueError(
          "DC search not expected in this test.")

      response = app.test_client().get(
          'api/stats/stat-var-search?query=person&limit=1')
      mock_search_dc.assert_not_called()
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_result_limit_one
      response = app.test_client().get(
          'api/stats/stat-var-search?query=person&limit=3')
      mock_search_dc.assert_not_called()
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_result_page_one
      response = app.test_client().get(
          'api/stats/stat-var-search?query=person&limit=10')
      mock_search_dc.assert_not_called()
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_result_all

  @mock.patch('server.routes.shared_api.stats.is_feature_enabled')
  @mock.patch('server.routes.shared_api.stats.dc.search_statvar')
  @mock.patch('server.routes.shared_api.stats.dc.filter_statvars')
  @mock.patch('server.routes.shared_api.stats.search_vertexai')
  def test_search_statvar_vai_missing_data(self, mock_search_vertexai, mock_filter_statvars,
                                           mock_search_dc,
                                           mock_is_feature_enabled):
    """Tests behaviour when Vertex AI search is enabled and returns incomplete StatVar data."""
    expected_query = 'person'
    vai_response = mock_data.VERTEX_AI_STAT_VAR_SEARCH_API_RESPONSE_MISSING_DATA
    expected_result = mock_data.STAT_VAR_SEARCH_RESPONSE_SV_ONLY

    def search_vai_side_effect(query, token, _=None):
      if query == expected_query and not token:
        return vai_response
      else:
        return []
      
    def filter_statvars_side_effect(stat_vars, _):
      return {'statVars': stat_vars}

    with app.app_context(), self.assertLogs(level='WARNING') as cm:
      mock_is_feature_enabled.return_value = True
      mock_search_vertexai.side_effect = search_vai_side_effect
      mock_filter_statvars.side_effect = filter_statvars_side_effect
      mock_search_dc.side_effect = ValueError(
          "DC search not expected in this test.")

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
      mock_search_dc.assert_not_called()
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_result
