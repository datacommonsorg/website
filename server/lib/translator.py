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

import re

from flask import current_app
from langdetect import detect as lang_detect
import requests

from server.lib.nl.common.counters import Counters
from shared.lib.constants import EN_LANG_CODE

_API_URL = "https://translation.googleapis.com/language/translate/v2"
_API_HEADER = {"content-type": "application/json"}


# Detects the query language and translates non-English queries to English.
# Returns a tuple of detected query language and the translated query.
def detect_lang_and_translate(query, counters: Counters) -> (str, str):
  try:
    lang = lang_detect(query)
    if lang.startswith(EN_LANG_CODE):
      return lang, query

    translations = _translate([query], lang, EN_LANG_CODE)

    if translations:
      counters.info(
          "query_translation",
          {
              "query": query,
              "translation": translations[0],
              "source_language": lang,
              "target_language": EN_LANG_CODE,
          },
      )
      return lang, translations[0]

    counters.err("empty_query_translation_error", {"query": query})
    return lang, query
  except Exception as e:
    counters.err("query_translation_error", {"query": query, "error": str(e)})
    return EN_LANG_CODE, query


class TranslationStringTokenizer:
  """Performs tokenization operations on translation strings.
  
  Replaces tokens (like "${date}") in strings with replacements 
  that won't be translated (like "___") to send for translation.

  It also supports a method to reinsert tokens back into the translated string.
  """

  # Regex to capture tokens such as "${date}".
  _TOKEN_PATTERN = r"\${[^}]+}"
  _TOKEN_REPLACEMENT = "___"

  def __init__(self, original_string: str) -> None:
    self.original_string = original_string
    self.tokens = re.findall(TranslationStringTokenizer._TOKEN_PATTERN,
                             original_string)
    self.string_for_translation = re.sub(
        TranslationStringTokenizer._TOKEN_PATTERN,
        TranslationStringTokenizer._TOKEN_REPLACEMENT,
        original_string,
    )

  def reinsert_tokens(self, translation):
    for token in self.tokens:
      translation = re.sub(TranslationStringTokenizer._TOKEN_REPLACEMENT,
                           token,
                           translation,
                           count=1)
    return translation


# Translates display strings in the provided page config and
# updates and returns the page config with the translations.
def translate_page_config(page_config: dict, i18n_lang: str,
                          counters: Counters) -> dict:
  try:
    original_strings = _get_strings_for_translation(page_config)
    tokenizers: list[TranslationStringTokenizer] = []
    strings_for_translation: list[str] = []
    for original_string in original_strings:
      tokenizer = TranslationStringTokenizer(original_string)
      tokenizers.append(tokenizer)
      strings_for_translation.append(tokenizer.string_for_translation)

    translated_strings = _translate(queries=strings_for_translation,
                                    source_lang=EN_LANG_CODE,
                                    target_lang=i18n_lang)

    translated_strings_with_tokens_reinserted = []
    for translated_string, tokenizer in zip(translated_strings, tokenizers):
      translated_strings_with_tokens_reinserted.append(
          tokenizer.reinsert_tokens(translated_string))
    translations = dict(
        zip(original_strings, translated_strings_with_tokens_reinserted))

    counters.info(
        "translate_page_config",
        {
            "num_translations": len(tokenizers),
            "translations": translations
        },
    )

    _populate_translated_strings(page_config, translations)

    return page_config
  except Exception as e:
    counters.err("translate_page_config_error", {"error": str(e)})
    return page_config


def _populate_translated_strings(page_config: dict, translations: dict[str,
                                                                       str]):

  def _maybe_update(obj: dict, field: str):
    original = obj.get(field, "")
    if original and original in translations:
      obj.update({field: translations[original]})

  for category in page_config.get("categories", []):
    for block in category.get("blocks", []):
      _maybe_update(block, "title")
      for column in block.get("columns", []):
        for tile in column.get("tiles", []):
          _maybe_update(tile, "description")
          _maybe_update(tile, "title")
    for sv in category.get("statVarSpec", {}).values():
      _maybe_update(sv, "name")


def _get_strings_for_translation(page_config: dict) -> list[str]:
  strings = {}

  def _maybe_add(string: str):
    if string and not string in strings:
      strings[string] = True

  for category in page_config.get("categories", []):
    for block in category.get("blocks", []):
      _maybe_add(block.get("title"))
      for column in block.get("columns", []):
        for tile in column.get("tiles", []):
          _maybe_add(tile.get("description"))
          _maybe_add(tile.get("title"))
    for sv in category.get("statVarSpec", {}).values():
      _maybe_add(sv.get("name"))

  return list(strings.keys())


def _translate(queries: list[str], source_lang: str,
               target_lang: str) -> list[str]:
  # The name "LLM_API_KEY" is a misnomer.
  # Both LLM and translation apis are enabled under this key.
  api_key = current_app.config.get("LLM_API_KEY")
  if not api_key:
    raise RuntimeError("Translation API key not specified.")

  request = {
      "q": queries,
      "format": "text",
      "source": source_lang,
      "target": target_lang,
  }
  response = requests.post(f"{_API_URL}?key={api_key}",
                           json=request,
                           headers=_API_HEADER).json()
  translations = []
  for translation in response.get("data", {}).get("translations", []):
    translations.append(translation.get("translatedText", ""))
  return translations
