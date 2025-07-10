# Copyright 2025 Google LLC
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
from unittest.mock import Mock
from unittest.mock import patch

from server.lib.nl.explore.explanation import generate_result_explanation
from web_app import app

QUERY = "What is the rate of education in El Paso?"
STAT_VARS = [
    'Bachelors Degree by Major', 'Population With Associates Degree by Gender',
    'Population With Bachelors Degree by Gender',
    'Population Enrolled in Private School by Race',
    'Population Enrolled in Public School by Race'
]
EXPECTED_EXPLANATION = """To explore the rate of education in El Paso, the population's educational attainment can be investigated.
The population with associate's, bachelor's, and doctorate degrees, along with overall educational attainment levels, represent key variables for this inquiry.
Additionally, student enrollment across various educational levels can be examined to understand educational participation."""


class TestResultExplanation(unittest.TestCase):

  @patch('server.routes.explore.api.explanation.generate_result_explanation',
         autospec=True)
  def test_result_explanation_typical(self, mock):
    mock.return_value = EXPECTED_EXPLANATION

    resp = app.test_client().post('api/explore/result-explanation',
                                  json={
                                      'q': QUERY,
                                      'statVars': STAT_VARS
                                  })

    assert resp.status_code == 200
    assert resp.json['result_explanation'] == EXPECTED_EXPLANATION

  def test_result_explanation_empty_stat_vars(self):
    stat_vars = []
    resp = app.test_client().post('api/explore/result-explanation',
                                  json={
                                      'q': QUERY,
                                      'statVars': stat_vars,
                                  })

    assert resp.status_code == 400
    assert resp.json['error'] == 'Missing statistical variables in request.'

  def test_result_explanation_empty_query(self):
    query = ""
    resp = app.test_client().post('api/explore/result-explanation',
                                  json={
                                      'q': query,
                                      'statVars': STAT_VARS,
                                  })

    assert resp.status_code == 400
    assert resp.json['error'] == 'Missing query in request.'

  @patch('server.routes.explore.api.explanation.generate_result_explanation',
         autospec=True)
  def test_result_explanation_error_gemini_call(self, mock):
    expected_explanation = ""

    mock.return_value = expected_explanation
    resp = app.test_client().post('api/explore/result-explanation',
                                  json={
                                      'q': QUERY,
                                      'statVars': STAT_VARS,
                                  })

    assert resp.status_code == 503
    assert resp.json[
        'error'] == "Result explanation could not be generated at this time."

  @patch('google.genai.Client', autospec=True)
  def test_generate_result_explanation_typical(self, mock_gemini):
    mock_gemini.return_value.models.generate_content.return_value.parsed.explanation = EXPECTED_EXPLANATION
    app.config['LLM_API_KEY'] = "MOCK_API_KEY"
    with app.app_context():
      assert EXPECTED_EXPLANATION == generate_result_explanation(
          query=QUERY, stat_vars=STAT_VARS)

  @patch('google.genai.Client', autospec=True)
  def test_generate_result_explanation_retry_once(self, mock_gemini):
    successful_client_response = Mock()
    successful_client_response.parsed.explanation = EXPECTED_EXPLANATION
    mock_gemini.return_value.models.generate_content.side_effect = [
        None, successful_client_response
    ]
    app.config['LLM_API_KEY'] = "MOCK_API_KEY"
    with app.app_context():
      assert EXPECTED_EXPLANATION == generate_result_explanation(
          query=QUERY, stat_vars=STAT_VARS)

  @patch('google.genai.Client', autospec=True)
  def test_generate_result_explanation_error_request(self, mock_gemini):
    mock_gemini.return_value.models.generate_content.side_effect = [
        None, None, None
    ]
    app.config['LLM_API_KEY'] = "MOCK_API_KEY"
    with app.app_context():
      assert None == generate_result_explanation(query=QUERY,
                                                 stat_vars=STAT_VARS)
