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

from google.cloud.language_v1.types import AnalyzeSyntaxResponse
from google.cloud.language_v1.types import PartOfSpeech
from google.cloud.language_v1.types import TextSpan
from google.cloud.language_v1.types import Token

from server.routes.shared_api.autocomplete import stat_vars


def _mock_token(text,
                pos_tag,
                begin_offset=0,
                proper=PartOfSpeech.Proper.NOT_PROPER):
  # This function now correctly mocks the nested structure of a Token object.
  token = Token()
  token.text = TextSpan(content=text, begin_offset=begin_offset)
  token.part_of_speech = PartOfSpeech(tag=pos_tag, proper=proper)
  return token


class TestStatVars(unittest.TestCase):

  @mock.patch('server.routes.shared_api.autocomplete.stat_vars._get_language_client')
  def test_analyze_query_concepts(self, mock_get_lang_client):

    def mock_analyze_syntax(document, encoding_type):
      query = document.content
      response = AnalyzeSyntaxResponse()
      if query == "how many students":
        response.tokens.extend([
            _mock_token("how", PartOfSpeech.Tag.ADV, 0),
            _mock_token("many", PartOfSpeech.Tag.ADJ, 4),
            _mock_token("students", PartOfSpeech.Tag.NOUN, 9),
        ])
      elif query == "Black high school students":
        response.tokens.extend([
            _mock_token("Black", PartOfSpeech.Tag.ADJ, 0),
            _mock_token("high", PartOfSpeech.Tag.ADJ, 6),
            _mock_token("school", PartOfSpeech.Tag.NOUN, 11),
            _mock_token("students", PartOfSpeech.Tag.NOUN, 18),
        ])
      elif query == "population in California":
        response.tokens.extend([
            _mock_token("population", PartOfSpeech.Tag.NOUN, 0),
            _mock_token("in", PartOfSpeech.Tag.ADP, 11),
            _mock_token("California",
                        PartOfSpeech.Tag.NOUN,
                        begin_offset=14,
                        proper=PartOfSpeech.Proper.PROPER),
        ])
      elif query == "annual amount of fossil fuel":
        response.tokens.extend([
            _mock_token("annual", PartOfSpeech.Tag.ADJ, 0),
            _mock_token("amount", PartOfSpeech.Tag.NOUN, 7),
            _mock_token("of", PartOfSpeech.Tag.ADP, 14),
            _mock_token("fossil", PartOfSpeech.Tag.NOUN, 17),
            _mock_token("fuel", PartOfSpeech.Tag.NOUN, 24),
        ])
      return response

    mock_lang_client = mock.Mock()
    mock_lang_client.analyze_syntax.side_effect = mock_analyze_syntax
    mock_get_lang_client.return_value = mock_lang_client

    # Test case 1: Adjectives are now removed.
    result1 = stat_vars.analyze_query_concepts("how many students")
    self.assertEqual(result1['cleaned_query'], "many students")
    self.assertEqual(result1['original_phrase'], "many students")

    # Test case 2: Important adjectives are kept by making them part of the noun.
    result2 = stat_vars.analyze_query_concepts("Black high school students")
    self.assertEqual(result2['cleaned_query'], "Black high school students")

    # Test case 3: Proper nouns removed
    result3 = stat_vars.analyze_query_concepts("population in California")
    self.assertEqual(result3['cleaned_query'], "population")
    self.assertEqual(result3['original_phrase'], "population")

    # Test case 4: Original phrase is correctly extracted
    result4 = stat_vars.analyze_query_concepts("annual amount of fossil fuel")
    self.assertEqual(result4['cleaned_query'], "annual amount fossil fuel")
    self.assertEqual(result4['original_phrase'], "annual amount of fossil fuel")