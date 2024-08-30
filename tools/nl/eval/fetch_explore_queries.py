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

import json
import os
from urllib.parse import quote

from absl import app
import pandas as pd
import requests

EXPLORE_CONFIG_RELATIVE_PATH = '../../../static/js/apps/explore_landing/topics.json'
NODEJS_URL = 'https://bard.datacommons.org/nodejs/query'
API_KEY = os.environ.get('NODEJS_API_KEY')


def call_dc(query):
  full_url = f'{NODEJS_URL}?q={quote(query)}&apikey={API_KEY}'
  response = requests.get(full_url).json()
  if 'debug' not in response:
    print("!!!!! no data")
    return []
  debug = response['debug']['debug']

  single_sv_best_score = debug['sv_matching']['CosineScore'][0]
  use_single_sv = True
  multi_sv_candidate = None
  if 'MultiSV' in debug['sv_matching']:
    for candidate in debug['sv_matching']['MultiSV']['Candidates']:
      if candidate['DelimBased'] and len(candidate['Parts']) == 2:
        # 0.05 matches the logic in
        # https://github.com/datacommonsorg/website/blob/12f305f6525bd5d34d45d564503f827dcad2a9ee/shared/lib/constants.py#L458
        if candidate['AggCosineScore'] + 0.05 > single_sv_best_score:
          use_single_sv = False
          multi_sv_candidate = candidate
          break

  result = []
  if use_single_sv:
    used_query = debug['query_detection_debug_logs']['query_transformations'][
        'sv_detection_query_stop_words_removal']
    sv = debug['sv_matching']['SV']
    sv_to_sentences = debug['sv_matching']['SV_to_Sentences']
    result = [{
        'query': query,
        'used_query': used_query,
        'sv': sv,
        'sv_to_sentences': sv_to_sentences,
    }]
  else:
    for part in multi_sv_candidate['Parts']:
      result.append({
          'query': query,
          'used_query': part['QueryPart'],
          'sv': part['SV'],
          'sv_to_sentences': {},
      })
  return result


def main(_):
  records = []
  basepath = os.path.dirname(__file__)
  explore_config_dir = os.path.abspath(
      os.path.join(basepath, EXPLORE_CONFIG_RELATIVE_PATH))
  with open(explore_config_dir, encoding='utf-8') as f:
    config = json.load(f)
    for _, topic_content in config['topics'].items():
      for _, sub_examples in topic_content['examples'].items():
        for example in sub_examples:
          query = example['title']
          print(query)
          dc_response = call_dc(query)
          for item in dc_response:
            for sv in item['sv']:
              records.append({
                  'query': item['query'],
                  'used_query': item['used_query'],
                  'sv': sv,
                  'sentences': item['sv_to_sentences'].get(sv, []),
              })

  df = pd.DataFrame.from_records(records)

  for column in ['query', 'used_query']:
    mask = df[column].eq(df[column].shift())
    df.loc[mask, column] = ''

  df.to_csv('result.csv')


if __name__ == "__main__":
  app.run(main)
