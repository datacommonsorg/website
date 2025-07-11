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

from server.lib.nl.explore.overview import generate_page_overview
from web_app import app

QUERY = "What is the rate of education in El Paso?"
STAT_VARS = [
    'Bachelors Degree by Major', 'Population With Associates Degree by Gender',
    'Population With Bachelors Degree by Gender',
    'Population Enrolled in Private School by Race',
    'Population Enrolled in Public School by Race'
]
EXPECTED_OVERVIEW = """To explore the rate of education in El Paso, the population's educational attainment can be investigated.
The population with associate's, bachelor's, and doctorate degrees, along with overall educational attainment levels, represent key variables for this inquiry.
Additionally, student enrollment across various educational levels can be examined to understand educational participation."""


class TestPageOverview(unittest.TestCase):

  @patch('server.routes.explore.api.overview.generate_page_overview',
         autospec=True)
  def test_page_overview_typical(self, mock):
    mock.return_value = EXPECTED_OVERVIEW

    resp = app.test_client().post('api/explore/page-overview',
                                  json={
                                      'q': QUERY,
                                      'statVars': STAT_VARS
                                  })

    assert resp.status_code == 200
    assert resp.json['page_overview'] == EXPECTED_OVERVIEW

  def test_page_overview_empty_stat_vars(self):
    stat_vars = []
    resp = app.test_client().post('api/explore/page-overview',
                                  json={
                                      'q': QUERY,
                                      'statVars': stat_vars,
                                  })

    assert resp.status_code == 400
    assert resp.json['error'] == 'Missing statistical variables in request.'

  def test_page_overview_empty_query(self):
    query = ""
    resp = app.test_client().post('api/explore/page-overview',
                                  json={
                                      'q': query,
                                      'statVars': STAT_VARS,
                                  })

    assert resp.status_code == 400
    assert resp.json['error'] == 'Missing query in request.'

  @patch('server.routes.explore.api.overview.generate_page_overview',
         autospec=True)
  def test_page_overview_error_gemini_call(self, mock):
    expected_overview = ""

    mock.return_value = expected_overview
    resp = app.test_client().post('api/explore/page-overview',
                                  json={
                                      'q': QUERY,
                                      'statVars': STAT_VARS,
                                  })

    assert resp.status_code == 503
    assert resp.json[
        'error'] == "Page overview could not be generated at this time."

  @patch('google.genai.Client', autospec=True)
  def test_generate_page_overview_typical(self, mock_gemini):
    mock_gemini.return_value.models.generate_content.return_value.parsed.overview = EXPECTED_OVERVIEW
    app.config['LLM_API_KEY'] = "MOCK_API_KEY"
    with app.app_context():
      assert EXPECTED_OVERVIEW == generate_page_overview(query=QUERY,
                                                         stat_vars=STAT_VARS)

  @patch('google.genai.Client', autospec=True)
  def test_generate_page_overview_retry_once(self, mock_gemini):
    successful_client_response = Mock()
    successful_client_response.parsed.overview = EXPECTED_OVERVIEW
    mock_gemini.return_value.models.generate_content.side_effect = [
        None, successful_client_response
    ]
    app.config['LLM_API_KEY'] = "MOCK_API_KEY"
    with app.app_context():
      assert EXPECTED_OVERVIEW == generate_page_overview(query=QUERY,
                                                         stat_vars=STAT_VARS)

  @patch('google.genai.Client', autospec=True)
  def test_generate_page_overview_error_request(self, mock_gemini):
    mock_gemini.return_value.models.generate_content.side_effect = [
        None, None, None
    ]
    app.config['LLM_API_KEY'] = "MOCK_API_KEY"
    with app.app_context():
      assert None == generate_page_overview(query=QUERY, stat_vars=STAT_VARS)
