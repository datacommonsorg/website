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
from server.lib.nl.explore.related import generate_follow_up_questions
from web_app import app


class TestFollowUpQuestions(unittest.TestCase):

  @patch('server.routes.explore.api.related.generate_follow_up_questions',
         autospec=True)
  def test_follow_up_questions_typical(self, mock):
    query = "What is the rate of education in El Paso?"
    related_topics = [
        "Educational Attachment", "School Type", "Housing", "Commute"
    ]

    expected_questions = [
        'What is the school dropout rate in El Paso?',
        'What is the distribution of students by school type in El Paso?',
        'What is the rate of homeownership in El Paso?',
        'What is the average commute time in El Paso?'
    ]
    mock.return_value = expected_questions

    resp = app.test_client().post('api/explore/follow-up-questions',
                                  json={
                                      'q': query,
                                      'relatedTopics': related_topics
                                  })

    assert resp.status_code == 200
    assert resp.json['follow_up_questions'] == expected_questions

  @patch('server.routes.explore.api.bad_words.is_safe', autospec=True)
  @patch('server.routes.explore.api.related.generate_follow_up_questions',
         autospec=True)
  def test_follow_up_questions_excludes_adversarial(self, mock_gemini,
                                                    mock_safe):
    query = "What is the rate of education in El Paso?"
    related_topics = [
        "Educational Attachment", "School Type", "Housing", "Commute"
    ]

    expected_questions = [
        'What is the school dropout rate in El Paso?',
        'What is the distribution of students by school type in El Paso?',
        'What is the rate of homeownership in El Paso?',
        'What is the average commute time in El Paso?'
    ]
    mock_gemini.return_value = expected_questions
    #Labels do not match the actual adversarial label of each query, it is simply for testing purposes.
    mock_safe.side_effect = [False, True, False, True]

    resp = app.test_client().post('api/explore/follow-up-questions',
                                  json={
                                      'q': query,
                                      'relatedTopics': related_topics
                                  })

    assert resp.status_code == 200
    assert resp.json['follow_up_questions'] == expected_questions[1:4:2]

  def test_follow_up_questions_empty_related_topics(self):
    query = "What is the rate of education in El Paso?"
    related_topics = []
    resp = app.test_client().post('api/explore/follow-up-questions',
                                  json={
                                      'q': query,
                                      'relatedTopics': related_topics
                                  })

    assert resp.status_code == 400
    assert resp.json['error'] == 'Missing related topics in request.'

  def test_follow_up_questions_empty_query(self):
    query = ""
    related_topics = ["Housing", "Commute"]
    resp = app.test_client().post('api/explore/follow-up-questions',
                                  json={
                                      'q': query,
                                      'relatedTopics': related_topics
                                  })

    assert resp.status_code == 400
    assert resp.json['error'] == 'Missing query in request.'

  @patch('server.routes.explore.api.related.generate_follow_up_questions',
         autospec=True)
  def test_follow_up_questions_error_gemini_call(self, mock):
    query = "What is the rate of education in El Paso?"
    related_topics = [
        "Educational Attachment", "School Type", "Housing", "Commute"
    ]
    expected_questions = []

    mock.return_value = expected_questions
    app.config['NL_BAD_WORDS'] = EMPTY_BANNED_WORDS
    resp = app.test_client().post('api/explore/follow-up-questions',
                                  json={
                                      'q': query,
                                      'relatedTopics': related_topics
                                  })

    assert resp.status_code == 200
    assert resp.json['follow_up_questions'] == expected_questions

  @patch('google.genai.Client', autospec=True)
  def test_generate_follow_up_questions_typical(self, mock_gemini):
    query = "What is the rate of education in El Paso?"
    related_topics = [
        "Educational Attachment", "School Type", "Housing", "Commute"
    ]
    expected_questions = [
        'What is the school dropout rate in El Paso?',
        'What is the distribution of students by school type in El Paso?',
        'What is the rate of homeownership in El Paso?',
        'What is the average commute time in El Paso?'
    ]
    mock_gemini.return_value.models.generate_content.return_value.parsed.questions = expected_questions
    app.config['LLM_API_KEY'] = "MOCK_API_KEY"
    with app.app_context():
      assert expected_questions == generate_follow_up_questions(
          query=query, related_topics=related_topics)

  @patch('google.genai.Client', autospec=True)
  def test_generate_follow_up_questions_retry_once(self, mock_gemini):
    query = "What is the rate of education in El Paso?"
    related_topics = [
        "Educational Attachment", "School Type", "Housing", "Commute"
    ]
    expected_questions = [
        'What is the school dropout rate in El Paso?',
        'What is the distribution of students by school type in El Paso?',
        'What is the rate of homeownership in El Paso?',
        'What is the average commute time in El Paso?'
    ]
    mock_gemini.return_value.models.generate_content.return_value.parsed.questions = expected_questions
    mock_gemini.return_value.models.generate_content.side_effect = [
        None, DEFAULT
    ]
    app.config['LLM_API_KEY'] = "MOCK_API_KEY"
    with app.app_context():
      assert expected_questions == generate_follow_up_questions(
          query=query, related_topics=related_topics)

  @patch('google.genai.Client', autospec=True)
  def test_generate_follow_up_questions_error_request(self, mock_gemini):
    query = "What is the rate of education in Mountain View?"
    related_topics = ["Education"]
    mock_gemini.return_value.models.generate_content.side_effect = [
        None, None, None
    ]
    app.config['LLM_API_KEY'] = "MOCK_API_KEY"
    with app.app_context():
      assert [] == generate_follow_up_questions(query=query,
                                                related_topics=related_topics)

  def test_generate_follow_up_questions_empty_related_topics(self):
    query = "What is the rate of education in Mountain View?"
    related_topics = []
    assert [] == generate_follow_up_questions(query=query,
                                              related_topics=related_topics)

  def test_generate_follow_up_questions_empty_query(self):
    query = ""
    related_topics = ["Housing", "Commute"]
    assert [] == generate_follow_up_questions(query=query,
                                              related_topics=related_topics)

  def test_generate_follow_up_questions_no_api_key(self):
    query = "MOCK QUERY"
    related_topics = ["Housing", "Commute"]
    with app.app_context():
      assert [] == generate_follow_up_questions(query=query,
                                                related_topics=related_topics)
