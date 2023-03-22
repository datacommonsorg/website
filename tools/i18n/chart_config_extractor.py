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
"""Script to generate a .pot file from the chart config, used for translations.

To run: `python3 tools/i18n/chart_config_extractor.py`

Though this should be run with the overall extract script:
./scripts/extract_messages.sh
"""

import json
import os

CHART_CONFIG_RELATIVE_PATH = '../../server/config/chart_config'
MESSAGES_POT_RELATIVE_PATH = '../../server/i18n/all.pot'


def extract_message_from_chart(config):
  id = config['titleId']
  message = config['title']
  description = config.get('description', '')
  return (id, {
      'message': message,
      'description': f'Title of a place chart: {description}'
  })


def maybe_add_message(messages, id, message):
  if not id is None and not message is None:
    if id in messages and \
        messages[id]['message'] != message['message']:
      raise ValueError(f'Adding duplicate id with different message: {id}')
    messages[id] = message


def main():
  basepath = os.path.dirname(__file__)
  chart_config_dir = os.path.abspath(
      os.path.join(basepath, CHART_CONFIG_RELATIVE_PATH))
  chart_config = []
  for filename in os.listdir(chart_config_dir):
    if filename.endswith(".json"):
      print("Processing: ", filename)
      with open(os.path.join(chart_config_dir, filename),
                encoding='utf-8') as f:
        chart_config.extend(json.load(f))

  messages = {}
  categories = set()
  categories.add("Overview")

  # Extract strings from each chart
  for conf in chart_config:
    categories.add(conf['category'])
    if 'topic' in conf:
      categories.add(conf['topic'])
    (id, message) = extract_message_from_chart(conf)
    maybe_add_message(messages, id, message)
    if conf.get('relatedChart', {}).get('scale', False):
      (id, message) = extract_message_from_chart(conf['relatedChart'])
      maybe_add_message(messages, id, message)

  # Add chart categories to the message catalog
  # TODO: Also add topics
  for category in categories:
    id = f'CHART_TITLE-CHART_CATEGORY-{category}'
    message = {
        'message': category,
        'description': 'The category for a group of statistical charts.',
    }
    maybe_add_message(messages, id, message)

  chart_pot_path = os.path.abspath(
      os.path.join(basepath, MESSAGES_POT_RELATIVE_PATH))
  with open(chart_pot_path, 'a+') as f:
    cnt = 0
    for id in sorted(messages.keys()):
      msg = messages[id]
      f.write(
        f"\n" \
        f"#. {msg['description']}\n" \
        f"msgid \"{id}\"\n" \
        f"msgstr \"{msg['message']}\"\n"
      )
      cnt += 1
  print(f"Wrote {cnt} messages.")

  return


if __name__ == "__main__":
  main()
