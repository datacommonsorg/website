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
from unittest.mock import patch

from main import app


class TestObservationId(unittest.TestCase):

    def test_required_predicates(self):
        """Failure if required fields are not present."""
        no_stat_var = app.test_client().get(
            '/api/browser/observation-ids?place=country/USA')
        assert no_stat_var.status_code == 400

        no_place = app.test_client().get(
            '/api/browser/observation-ids?statVar=testStatVar')
        assert no_place.status_code == 400

    @patch('routes.api.browser.dc.query')
    def test_observation_node_dcid_returned(self, mock_query):
        expected_query = '''
        SELECT ?dcid ?obsDate
        WHERE { 
            ?svObservation typeOf StatVarObservation .
            ?svObservation variableMeasured test_stat_var . 
            ?svObservation observationAbout geoId/06 .
            ?svObservation dcid ?dcid .
            ?svObservation observationDate ?obsDate .
            
            
        }
    '''
        obs_date = "2001"
        expected_obs_id = "test_obs_id"

        def side_effect(query):
            if query == expected_query:
                return (['?dcid', '?obsDate'], [{
                    'cells': [{
                        'value': expected_obs_id
                    }, {
                        'value': obs_date
                    }]
                }])
            else:
                return ([], [])

        mock_query.side_effect = side_effect
        response = app.test_client().get(
            'api/browser/observation-ids?statVar=test_stat_var&place=geoId/06')
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result[obs_date] == expected_obs_id

    @patch('routes.api.browser.dc.query')
    def test_with_optional_predicates(self, mock_query):
        expected_query = '''
        SELECT ?dcid ?obsDate
        WHERE { 
            ?svObservation typeOf StatVarObservation .
            ?svObservation variableMeasured test_stat_var . 
            ?svObservation observationAbout geoId/06 .
            ?svObservation dcid ?dcid .
            ?svObservation observationDate ?obsDate .
            ?svObservation measurementMethod testMethod .
            ?svObservation observationPeriod testObsPeriod .
        }
    '''
        obs_date = "2001"
        expected_obs_id = "test_obs_id"

        def side_effect(query):
            if query == expected_query:
                return (['?dcid', '?obsDate'], [{
                    'cells': [{
                        'value': expected_obs_id
                    }, {
                        'value': obs_date
                    }]
                }])
            else:
                return ([], [])

        mock_query.side_effect = side_effect
        response = app.test_client().get(
            'api/browser/observation-ids?statVar=test_stat_var&place=geoId/06&measurementMethod=testMethod&obsPeriod=testObsPeriod'
        )
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result[obs_date] == expected_obs_id
