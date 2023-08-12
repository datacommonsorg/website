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
"""Utility functions for i18n"""

DEFAULT_LOCALE = 'en'

# List of available languages for translations.
# NOTE: language codes must be lowercase!
AVAILABLE_LANGUAGES = ['de', 'en', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'ru']


def locale_choices(requested_locale=''):
  """
  Returns a list of available locale choices, from most to least specific, to fulfill
  the requested locale.
  - If available, requested_locale
  - If available, the language code without the locale
  - The default language, 'en'
  """
  requested_locale = requested_locale.lower()
  accepted_languages = []
  if requested_locale != DEFAULT_LOCALE:
    if requested_locale in AVAILABLE_LANGUAGES:
      accepted_languages.append(requested_locale)

    fallback_lang = requested_locale.split('-')[0] if requested_locale.find(
      '-') != -1 else ''
    if fallback_lang in AVAILABLE_LANGUAGES:
      accepted_languages.append(fallback_lang)

  accepted_languages.append(DEFAULT_LOCALE)
  return accepted_languages
