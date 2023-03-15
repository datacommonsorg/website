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

  @mock.patch('server.services.datacommons.send_request')
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
                'objectTypes': ['RepresentativeConcentrationPathwayEnum'],
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

  @mock.patch('server.routes.api.stats.dc.search_statvar')
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
