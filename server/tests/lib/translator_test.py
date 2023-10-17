# Copyright 2023 Google LLC
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

from dataclasses import dataclass
import unittest
from unittest.mock import Mock
from unittest.mock import patch

from server.lib.nl.common.counters import Counters
from server.lib.translator import translate_page_config
from server.lib.translator import TranslationStringTokenizer


def get_config(strings: list[str]) -> dict:
  return {
      "categories": [{
          "blocks": [{
              "title":
                  strings[0],
              "columns": [{
                  "tiles": [{
                      "description": strings[1],
                      "title": strings[2],
                  }]
              }],
          }],
          "statVarSpec": {
              "any": {
                  "name": strings[3]
              }
          },
      }]
  }


@dataclass
class Translation:
  original: str
  translated: str
  translated_with_reinserted_tokens: str


TRANSLATIONS: list[Translation] = [
    Translation("No tokens", "Translated no tokens", "Translated no tokens"),
    Translation(
        "One ${date} token",
        "Translated one ___ token",
        "Translated one ${date} token",
    ),
    Translation(
        "Another one ${place} token",
        "Translated another one ___ token",
        "Translated another one ${place} token",
    ),
    Translation(
        "Two ${date} and ${place} tokens",
        "Translated two ___ and ___ tokens",
        "Translated two ${date} and ${place} tokens",
    ),
]

TRANSLATE_API_RETURN_VALUE = list([t.translated for t in TRANSLATIONS])
INPUT_PAGE_CONFIG = get_config([t.original for t in TRANSLATIONS])
TRANSLATED_PAGE_CONFIG = get_config(
    [t.translated_with_reinserted_tokens for t in TRANSLATIONS])


class TestTranslatePageConfig(unittest.TestCase):

  @patch("server.lib.translator._translate")
  def test_translate_page_config(self, mock_translate_func: Mock):
    self.maxDiff = None
    mock_translate_func.return_value = TRANSLATE_API_RETURN_VALUE
    result = translate_page_config(INPUT_PAGE_CONFIG, "hi", Counters())
    self.assertEqual(result, TRANSLATED_PAGE_CONFIG)


class TestTranslationStringTokenizer(unittest.TestCase):

  @dataclass
  class Expected:
    tokens: list[str]
    string_for_translation: str
    final_translated_string: str

  @dataclass
  class Case:
    original_string: str
    translation: str
    expected: "TestTranslationStringTokenizer.Expected"

  def test_translation_string_tokenizer(self):
    cases = [
        TestTranslationStringTokenizer.Case(
            original_string="No tokens",
            translation="No tokens",
            expected=TestTranslationStringTokenizer.Expected(
                tokens=[],
                string_for_translation="No tokens",
                final_translated_string="No tokens",
            ),
        ),
        TestTranslationStringTokenizer.Case(
            original_string="One ${date} token",
            translation="Translated one ___ token",
            expected=TestTranslationStringTokenizer.Expected(
                tokens=["${date}"],
                string_for_translation="One ___ token",
                final_translated_string="Translated one ${date} token",
            ),
        ),
        TestTranslationStringTokenizer.Case(
            original_string="Two ${date} and ${place} tokens",
            translation="Translated two ___ and ___ tokens",
            expected=TestTranslationStringTokenizer.Expected(
                tokens=["${date}", "${place}"],
                string_for_translation="Two ___ and ___ tokens",
                final_translated_string=
                "Translated two ${date} and ${place} tokens",
            ),
        ),
    ]
    for case in cases:
      expected = case.expected
      tokenizer = TranslationStringTokenizer(case.original_string)
      self.assertEqual(tokenizer.tokens, expected.tokens)
      self.assertEqual(tokenizer.string_for_translation,
                       expected.string_for_translation)
      self.assertEqual(
          tokenizer.reinsert_tokens(case.translation),
          expected.final_translated_string,
      )
