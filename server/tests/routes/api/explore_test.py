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
from unittest.mock import DEFAULT
from unittest.mock import patch

from server.lib.nl.common.bad_words import EMPTY_BANNED_WORDS
from server.lib.nl.explore.explanation import generate_overall_explanation
from server.lib.nl.explore.related import generate_follow_up_questions
from web_app import app

QUERY = "What is the rate of education in El Paso?"
RELATED_TOPICS = ["Educational Attachment", "School Type", "Housing", "Commute"]
STAT_VARS = [
    'Bachelors Degree by Major', 'Population With Associates Degree by Gender',
    'Population With Bachelors Degree by Gender',
    'Population Enrolled in Private School by Race',
    'Population Enrolled in Public School by Race'
]
EXPECTED_QUESTIONS = [
    'What is the school dropout rate in El Paso?',
    'What is the distribution of students by school type in El Paso?',
    'What is the rate of homeownership in El Paso?',
    'What is the average commute time in El Paso?'
]

EXPECTED_EXPLANATION = """To explore the rate of education in El Paso, the population's educational attainment can be investigated.
The population with associate's, bachelor's, and doctorate degrees, along with overall educational attainment levels, represent key variables for this inquiry.
Additionally, student enrollment across various educational levels can be examined to understand educational participation."""


class TestFollowUpQuestions(unittest.TestCase):

  @patch('server.routes.explore.api.related.generate_follow_up_questions',
         autospec=True)
  def test_follow_up_questions_typical(self, mock):
    mock.return_value = EXPECTED_QUESTIONS

    app.config['NL_BAD_WORDS'] = EMPTY_BANNED_WORDS
    resp = app.test_client().post('api/explore/follow-up-questions',
                                  json={
                                      'q': QUERY,
                                      'relatedTopics': RELATED_TOPICS
                                  })

    assert resp.status_code == 200
    assert resp.json['follow_up_questions'] == EXPECTED_QUESTIONS

  @patch('server.routes.explore.api.bad_words.is_safe', autospec=True)
  @patch('server.routes.explore.api.related.generate_follow_up_questions',
         autospec=True)
  def test_follow_up_questions_excludes_adversarial(self, mock_gemini,
                                                    mock_safe):
    mock_gemini.return_value = EXPECTED_QUESTIONS
    #Labels do not match the actual adversarial label of each query, it is simply for testing purposes.
    mock_safe.side_effect = [False, True, False, True]

    resp = app.test_client().post('api/explore/follow-up-questions',
                                  json={
                                      'q': QUERY,
                                      'relatedTopics': RELATED_TOPICS
                                  })

    assert resp.status_code == 200
    assert resp.json['follow_up_questions'] == EXPECTED_QUESTIONS[1:4:2]

  def test_follow_up_questions_empty_related_topics(self):
    related_topics = []
    resp = app.test_client().post('api/explore/follow-up-questions',
                                  json={
                                      'q': QUERY,
                                      'relatedTopics': related_topics
                                  })

    assert resp.status_code == 400
    assert resp.json['error'] == 'Missing related topics in request.'

  def test_follow_up_questions_empty_query(self):
    query = ""
    resp = app.test_client().post('api/explore/follow-up-questions',
                                  json={
                                      'q': query,
                                      'relatedTopics': RELATED_TOPICS
                                  })

    assert resp.status_code == 400
    assert resp.json['error'] == 'Missing query in request.'

  @patch('server.routes.explore.api.related.generate_follow_up_questions',
         autospec=True)
  def test_follow_up_questions_error_gemini_call(self, mock):
    expected_questions = []

    mock.return_value = expected_questions
    app.config['NL_BAD_WORDS'] = EMPTY_BANNED_WORDS
    resp = app.test_client().post('api/explore/follow-up-questions',
                                  json={
                                      'q': QUERY,
                                      'relatedTopics': RELATED_TOPICS
                                  })

    assert resp.status_code == 200
    assert resp.json['follow_up_questions'] == expected_questions

  @patch('google.genai.Client', autospec=True)
  def test_generate_follow_up_questions_typical(self, mock_gemini):
    mock_gemini.return_value.models.generate_content.return_value.parsed.questions = EXPECTED_QUESTIONS
    app.config['LLM_API_KEY'] = "MOCK_API_KEY"
    with app.app_context():
      assert EXPECTED_QUESTIONS == generate_follow_up_questions(
          query=QUERY, related_topics=RELATED_TOPICS)

  @patch('google.genai.Client', autospec=True)
  def test_generate_follow_up_questions_retry_once(self, mock_gemini):
    mock_gemini.return_value.models.generate_content.return_value.parsed.questions = EXPECTED_QUESTIONS
    mock_gemini.return_value.models.generate_content.side_effect = [
        None, DEFAULT
    ]
    app.config['LLM_API_KEY'] = "MOCK_API_KEY"
    with app.app_context():
      assert EXPECTED_QUESTIONS == generate_follow_up_questions(
          query=QUERY, related_topics=RELATED_TOPICS)

  @patch('google.genai.Client', autospec=True)
  def test_generate_follow_up_questions_error_request(self, mock_gemini):
    mock_gemini.return_value.models.generate_content.side_effect = [
        None, None, None
    ]
    app.config['LLM_API_KEY'] = "MOCK_API_KEY"
    with app.app_context():
      assert [] == generate_follow_up_questions(query=QUERY,
                                                related_topics=RELATED_TOPICS)

  def test_generate_follow_up_questions_empty_related_topics(self):
    related_topics = []
    assert [] == generate_follow_up_questions(query=QUERY,
                                              related_topics=related_topics)

  def test_generate_follow_up_questions_empty_query(self):
    query = ""
    assert [] == generate_follow_up_questions(query=query,
                                              related_topics=RELATED_TOPICS)

  def test_generate_follow_up_questions_no_api_key(self):
    # By default, the test app does not have an API key.
    with app.app_context():
      assert [] == generate_follow_up_questions(query=QUERY,
                                                related_topics=RELATED_TOPICS)

  @patch('server.routes.explore.api.explanation.generate_overall_explanation',
         autospec=True)
  def test_overall_explanation_typical(self, mock):
    mock.return_value = EXPECTED_EXPLANATION

    resp = app.test_client().post('api/explore/overall-explanation',
                                  json={
                                      'q': QUERY,
                                      'statVars': STAT_VARS
                                  })

    assert resp.status_code == 200
    assert resp.json['overall_explanation'] == EXPECTED_EXPLANATION

  def test_overall_explanation_empty_stat_vars(self):
    stat_vars = []
    resp = app.test_client().post('api/explore/overall-explanation',
                                  json={
                                      'q': QUERY,
                                      'statVars': stat_vars,
                                  })

    assert resp.status_code == 400
    assert resp.json['error'] == 'Missing statistical variables in request.'

  def test_overall_explanation_empty_query(self):
    query = ""
    resp = app.test_client().post('api/explore/overall-explanation',
                                  json={
                                      'q': query,
                                      'statVars': STAT_VARS,
                                  })

    assert resp.status_code == 400
    assert resp.json['error'] == 'Missing query in request.'

  @patch('server.routes.explore.api.explanation.generate_overall_explanation',
         autospec=True)
  def test_overall_explanation_error_gemini_call(self, mock):
    expected_explanation = ""

    mock.return_value = expected_explanation
    resp = app.test_client().post('api/explore/overall-explanation',
                                  json={
                                      'q': QUERY,
                                      'statVars': STAT_VARS,
                                  })

    assert resp.status_code == 200
    assert resp.json['overall_explanation'] == expected_explanation

  @patch('google.genai.Client', autospec=True)
  def test_generate_overall_explanation_typical(self, mock_gemini):
    mock_gemini.return_value.models.generate_content.return_value.parsed.explanation = EXPECTED_EXPLANATION
    app.config['LLM_API_KEY'] = "MOCK_API_KEY"
    with app.app_context():
      assert EXPECTED_EXPLANATION == generate_overall_explanation(
          query=QUERY, stat_vars=STAT_VARS)

  @patch('google.genai.Client', autospec=True)
  def test_generate_overall_explanation_retry_once(self, mock_gemini):
    mock_gemini.return_value.models.generate_content.return_value.parsed.explanation = EXPECTED_EXPLANATION
    mock_gemini.return_value.models.generate_content.side_effect = [
        None, DEFAULT
    ]
    app.config['LLM_API_KEY'] = "MOCK_API_KEY"
    with app.app_context():
      assert EXPECTED_EXPLANATION == generate_overall_explanation(
          query=QUERY, stat_vars=STAT_VARS)

  @patch('google.genai.Client', autospec=True)
  def test_generate_overall_explanation_error_request(self, mock_gemini):
    mock_gemini.return_value.models.generate_content.side_effect = [
        None, None, None
    ]
    app.config['LLM_API_KEY'] = "MOCK_API_KEY"
    with app.app_context():
      assert "" == generate_overall_explanation(query=QUERY,
                                                stat_vars=STAT_VARS)

  def test_generate_overall_explanation_empty_stat_vars(self):
    stat_vars = []
    assert "" == generate_overall_explanation(query=QUERY, stat_vars=stat_vars)

  def test_generate_overall_explanation_empty_query(self):
    query = ""
    assert "" == generate_overall_explanation(query=query, stat_vars=STAT_VARS)

  def test_generate_overall_explanation_no_api_key(self):
    # By default, the test app does not have an API key.
    with app.app_context():
      assert "" == generate_overall_explanation(query=QUERY,
                                                stat_vars=STAT_VARS)
