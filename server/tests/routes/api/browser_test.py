# Copyright 2022 Google LLC
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
from unittest.mock import patch

from web_app import app


class TestObservationId(unittest.TestCase):

  def test_required_predicates(self):
    """Failure if required fields are not present."""
    no_stat_var = app.test_client().get(
        '/api/browser/observation-id?place=country/USA&date=2021')
    assert no_stat_var.status_code == 400

    no_place = app.test_client().get(
        '/api/browser/observation-id?statVar=testStatVar&date=2021')
    assert no_place.status_code == 400

    no_date = app.test_client().get(
        '/api/browser/observation-id?statVar=testStatVar&place=country/USA')
    assert no_date.status_code == 400

  @patch('server.routes.browser.api.dc.query')
  def test_observation_node_dcid_returned(self, mock_query):
    expected_query = '''
SELECT ?dcid ?mmethod ?obsPeriod
WHERE {
    ?svObservation typeOf StatVarObservation .
    ?svObservation variableMeasured test_stat_var .
    ?svObservation observationAbout geoId/06 .
    ?svObservation dcid ?dcid .
    ?svObservation measurementMethod ?mmethod .
    ?svObservation observationPeriod ?obsPeriod .
    ?svObservation observationDate "2021" .
}
'''
    expected_obs_id = "test_obs_id"

    def side_effect(query):
      if query == expected_query:
        return (['?dcid', '?mmethod', '?obsPeriod', '?obsDate'], [{
            'cells': [{
                'value': 'obs_id1'
            }, {
                'value': 'test_mmethod'
            }, {}]
        }, {
            'cells': [{
                'value': expected_obs_id
            }, {}, {}]
        }])
      else:
        return ([], [])

    mock_query.side_effect = side_effect
    response = app.test_client().get(
        'api/browser/observation-id?statVar=test_stat_var&place=geoId/06&date=2021'
    )
    assert response.status_code == 200
    assert json.loads(response.data) == expected_obs_id

  @patch('server.routes.browser.api.dc.query')
  def test_with_optional_predicates(self, mock_query):
    expected_query = '''
SELECT ?dcid ?mmethod ?obsPeriod
WHERE {
    ?svObservation typeOf StatVarObservation .
    ?svObservation variableMeasured test_stat_var .
    ?svObservation observationAbout geoId/06 .
    ?svObservation dcid ?dcid .
    ?svObservation measurementMethod ?mmethod .
    ?svObservation observationPeriod ?obsPeriod .
    ?svObservation observationDate "2021" .
}
'''
    expected_obs_id = "test_obs_id"

    def side_effect(query):
      if query == expected_query:
        return (['?dcid', '?mmethod', '?obsPeriod', '?obsDate'], [{
            'cells': [{
                'value': 'obs_id1'
            }, {
                'value': 'test_mmethod'
            }, {}]
        }, {
            'cells': [{
                'value': expected_obs_id
            }, {
                'value': 'testMethod'
            }, {
                'value': 'testObsPeriod'
            }]
        }])
      else:
        return ([], [])

    mock_query.side_effect = side_effect
    response = app.test_client().get(
        'api/browser/observation-id?statVar=test_stat_var&place=geoId/06&date=2021&measurementMethod=testMethod&obsPeriod=testObsPeriod'
    )
    assert response.status_code == 200
    assert json.loads(response.data) == expected_obs_id
