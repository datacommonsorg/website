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

class MockVertexAIResult:
    def __init__(self, results, next_page_token=None):
        self.results = results
        self.next_page_token = next_page_token

class MockResponseItem:
    def __init__(self, document_data):
        self.document = MockDocument(document_data)

class MockDocument:
    def __init__(self, struct_data):
        self.struct_data = struct_data

class TestSearchStatVar(unittest.TestCase):

  @mock.patch('server.lib.feature_flags.is_feature_enabled')
  @mock.patch('server.routes.shared_api.stats.dc.search_statvar')
  @mock.patch('server.routes.shared_api.stats.search_vertexai')
  def test_search_statvar_dc_single_token_vai_disabled(self, mock_search_vertexai, mock_search_dc, mock_is_feature_enabled):
    """Tests behaviour when Vertex AI search is disabled."""
    expected_query = 'person'
    expected_places = ["geoId/06"]
    expected_result = {'statVarGroups': ['group_1', 'group_2']}
    expected_sv_only_result = {'statVars': [{'name': 'sv1', 'dcid': 'sv1'}]}
    expected_no_places_result = {'statVarGroups': ['group_3'], 'statVars': [{'name': 'sv2', 'dcid': 'sv2'}]}

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
      mock_search_vertexai.side_effect = ValueError("Vertex AI search not expected in this test.")
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
      response = app.test_client().get(
          'api/stats/stat-var-search?query=person')
      mock_search_vertexai.assert_not_called()
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_no_places_result

  @mock.patch('server.lib.feature_flags.is_feature_enabled')
  @mock.patch('server.routes.shared_api.stats.dc.search_statvar')
  @mock.patch('server.routes.shared_api.stats.search_vertexai')
  def test_search_statvar_vai_enabled_places_specified(self, mock_search_vertexai, mock_search_dc, mock_is_feature_enabled):
    """Tests behaviour when Vertex AI search is enabled, but places are specified (i.e. should fall back to DC search)."""
    expected_query = 'person'
    expected_places = ["geoId/06"]
    expected_result = {'statVars': [{'name': 'sv1', 'dcid': 'sv1'}]}

    def search_dc_side_effect(query, places, sv_only):
      if query == expected_query and places == expected_places and sv_only:
        return expected_result
      else:
        return []

    with app.app_context():
      mock_is_feature_enabled.return_value = True
      mock_search_vertexai.side_effect = ValueError("Vertex AI search not expected in this test.")
      mock_search_dc.side_effect = search_dc_side_effect
    
      response = app.test_client().get(
          'api/stats/stat-var-search?query=person&places=geoId/06&svOnly=1')
      mock_search_vertexai.assert_not_called()
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_result

  @mock.patch('server.routes.shared_api.stats.is_feature_enabled')
  @mock.patch('server.routes.shared_api.stats.dc.search_statvar')
  @mock.patch('server.routes.shared_api.stats.search_vertexai')
  def test_search_statvar_vai_enabled(self, mock_search_vertexai, mock_search_dc, mock_is_feature_enabled):
    """Tests behaviour when Vertex AI search is enabled and should be called."""
    expected_query = 'person'
    vai_response_page_one = MockVertexAIResult(
      results=[
        MockResponseItem(document_data={'dcid': 'sv1', 'name': 'sv1'}),
        MockResponseItem(document_data={'dcid': 'sv2', 'name': 'sv2'}),
        MockResponseItem(document_data={'dcid': 'sv3', 'name': 'sv3'})
      ],
      next_page_token='page_two'
    )
    vai_response_page_two = MockVertexAIResult(
      results=[
        MockResponseItem(document_data={'dcid': 'sv4', 'name': 'sv4'}),
        MockResponseItem(document_data={'dcid': 'sv5', 'name': 'sv5'}),
        MockResponseItem(document_data={'dcid': 'sv6', 'name': 'sv6'})
      ],
      next_page_token=None
    )    
    expected_response_limit_one = {
      'statVars': [{'dcid': 'sv1', 'name': 'sv1'}]
    }
    expected_response_page_one = {
      'statVars': [
        {'dcid': 'sv1', 'name': 'sv1'}, 
        {'dcid': 'sv2', 'name': 'sv2'}, 
        {'dcid': 'sv3', 'name': 'sv3'}
      ]
    }
    expected_response_all = {
      'statVars': [
        {'dcid': 'sv1', 'name': 'sv1'},
        {'dcid': 'sv2', 'name': 'sv2'},
        {'dcid': 'sv3', 'name': 'sv3'},
        {'dcid': 'sv4', 'name': 'sv4'},
        {'dcid': 'sv5', 'name': 'sv5'},
        {'dcid': 'sv6', 'name': 'sv6'}
      ]
    }

    def search_vai_side_effect(query, token):
      if query == expected_query and not token:
        return vai_response_page_one
      elif query == expected_query and token == 'page_two':
        return vai_response_page_two
      else:
        return []
    
    with app.app_context():
      mock_is_feature_enabled.return_value = True
      mock_search_vertexai.side_effect = search_vai_side_effect
      mock_search_dc.side_effect = ValueError("DC search not expected in this test.")
    
      response = app.test_client().get(
            'api/stats/stat-var-search?query=person&limit=1')
      mock_search_dc.assert_not_called()
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_response_limit_one
      response = app.test_client().get(
          'api/stats/stat-var-search?query=person&limit=3')
      mock_search_dc.assert_not_called()
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_response_page_one
      response = app.test_client().get(
          'api/stats/stat-var-search?query=person&limit=10')
      mock_search_dc.assert_not_called()
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_response_all

