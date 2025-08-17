# Copyright 2024 Google LLC
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
from unittest import mock

from google.cloud.language_v1.types import AnalyzeSyntaxResponse, PartOfSpeech, Token

from server.routes.shared_api.autocomplete import stat_vars


def _mock_token(text, pos_tag, proper=PartOfSpeech.Proper.NOT_PROPER):
  token = mock.Mock(spec=Token)
  token.text.content = text
  token.text.begin_offset = 0
  token.part_of_speech.tag = pos_tag
  token.part_of_speech.proper = proper
  return token


class TestStatVars(unittest.TestCase):

  @mock.patch('server.routes.shared_api.autocomplete.stat_vars.LANGUAGE_CLIENT')
  def test_analyze_query_concepts(self, mock_lang_client):

    def mock_analyze_syntax(document, encoding_type):
      query = document.content
      response = AnalyzeSyntaxResponse()
      if query == "how many students":
        response.tokens.extend([
            _mock_token("how", PartOfSpeech.Tag.ADV),
            _mock_token("many", PartOfSpeech.Tag.ADJ),
            _mock_token("students", PartOfSpeech.Tag.NOUN),
        ])
      elif query == "Black high school students":
        response.tokens.extend([
            _mock_token("Black", PartOfSpeech.Tag.ADJ),
            _mock_token("high", PartOfSpeech.Tag.ADJ),
            _mock_token("school", PartOfSpeech.Tag.NOUN),
            _mock_token("students", PartOfSpeech.Tag.NOUN),
        ])
      elif query == "population in California":
        response.tokens.extend([
            _mock_token("population", PartOfSpeech.Tag.NOUN),
            _mock_token("in", PartOfSpeech.Tag.ADP),
            _mock_token("California",
                        PartOfSpeech.Tag.NOUN,
                        proper=PartOfSpeech.Proper.PROPER),
        ])
      return response

    mock_lang_client.analyze_syntax.side_effect = mock_analyze_syntax

    # Test case 1: Filler words
    result1 = stat_vars.analyze_query_concepts("how many students")
    self.assertEqual(result1['cleaned_query'], "many students")
    self.assertEqual(result1['original_phrase'], "many students")

    # Test case 2: Descriptors preserved
    result2 = stat_vars.analyze_query_concepts("Black high school students")
    self.assertEqual(result2['cleaned_query'], "Black high school students")

    # Test case 3: Proper nouns removed
    result3 = stat_vars.analyze_query_concepts("population in California")
    self.assertEqual(result3['cleaned_query'], "population")
    self.assertEqual(result3['original_phrase'], "population")
