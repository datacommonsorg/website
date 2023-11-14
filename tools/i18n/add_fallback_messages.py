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
"""Script to add fallback messages for config messages.

Adds defaultMessage for new, untranslated message Id's from DEFAULT_LOCALE to a
specified locale.

To run: `python3 tools/i18n/add_fallback_messages.py hi stats_var_labels.json`

Though this should be run with the overall extract script:
./scripts/extract_messages.sh
"""

import json
import sys
from typing import Dict, Tuple

DEFAULT_LOCALE = 'en'
LOCALE_RELATIVE_PATH = 'static/js/i18n/strings/{locale}/{filename}'

MessageDict = Dict[str, str]
BundleDict = Dict[str, MessageDict]


def extract_messages_from_file(locale: str, filename: str) -> BundleDict:
  path = LOCALE_RELATIVE_PATH.format(locale=locale, filename=filename)
  with open(path, encoding='utf-8') as f:
    msg_dict = json.loads(f.read())
  return msg_dict


def merge_messages(default_messages: BundleDict,
                   lang_messages: BundleDict) -> Tuple[int, BundleDict]:
  added_count = 0
  for msg_id, message in default_messages.items():
    if msg_id in lang_messages:
      continue
    message.pop('description')
    lang_messages[msg_id] = message
    added_count += 1
  return added_count, lang_messages


def write_messages(locale: str, filename: str, locale_messages: BundleDict):
  path = LOCALE_RELATIVE_PATH.format(locale=locale, filename=filename)
  with open(path, 'w', encoding='utf-8') as f:
    json.dump(locale_messages, f, ensure_ascii=False, indent=2, sort_keys=True)


def main():
  assert (len(sys.argv) == 3)
  locale = sys.argv[1]
  filename = sys.argv[2]
  default_messages = extract_messages_from_file(DEFAULT_LOCALE, filename)
  locale_messages = extract_messages_from_file(locale, filename)
  added_count, locale_messages = merge_messages(default_messages,
                                                locale_messages)
  write_messages(locale, filename, locale_messages)
  print(f'Added {added_count} messages for {locale}/{filename}')


if __name__ == "__main__":
  main()
