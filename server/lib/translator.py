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

import logging

from flask import current_app
from langdetect import detect as lang_detect
import requests

from server.lib.nl.common.counters import Counters

_API_URL = "https://translation.googleapis.com/language/translate/v2"
_API_HEADER = {'content-type': 'application/json'}
_EN_LANG = "en"


# Detects the query language and translates non-English queries to English.
def detect_lang_and_translate(query, counters: Counters, api_key=None):
  try:
    lang = lang_detect(query)
    if lang.startswith(_EN_LANG):
      return query

    if not api_key:
      api_key = current_app.config['PALM_API_KEY']
    request = {"q": query, "format": "text", "source": lang, "target": _EN_LANG}
    response = requests.post(f'{_API_URL}?key={api_key}',
                             json=request,
                             headers=_API_HEADER).json()

    translation = response.get("data",
                               {}).get("translations",
                                       [{}])[0].get("translatedText", "")
    if translation:
      counters.info(
          "query_translation", {
              "query": query,
              "translation": translation,
              "source_language": lang,
              "target_language": _EN_LANG
          })
      return translation
    return query
  except Exception as e:
    counters.err(f"Error detecting / translating query: {query}\n{str(e)}", "")
    return query
