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


class TestSearchStatVar(unittest.TestCase):

  @mock.patch('server.routes.shared_api.stats.dc.search_statvar')
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
          'api/stats/stat-var-search?query=person&places=geoId/06&svOnly=1')
      assert response.status_code == 200
      result = json.loads(response.data)
      assert result == expected_sv_only_result
