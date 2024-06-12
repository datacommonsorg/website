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

import csv

from absl import app
from absl import flags
import requests

import shared.lib.utils as shared_utils

FLAGS = flags.FLAGS

flags.DEFINE_string('queryset', '', 'Full path to queryset CSV')
flags.DEFINE_string('queryset_vars', '', 'Full path to output queryset CSV')
flags.DEFINE_string('endpoint', 'https://dev.datacommons.org', 'URL endpoint')

_ALL_STOP_WORDS = shared_utils.combine_stop_words()


def _url():
  return f'{FLAGS.endpoint}/api/explore/detect?q='


def clean_vars(query_file, output_file):
  failed_queries = []
  added_queries = set()
  with open(output_file, 'w') as outf:
    writer = csv.writer(outf)
    with open(query_file) as inf:
      for row in csv.reader(inf):
        if not row:
          writer.writerow(row)
          continue
        query = row[0].strip()
        if not query or query.startswith('#') or query.startswith('//'):
          writer.writerow(row)
          continue
        assert ';' not in query, 'Multiple query not yet supported'

        # Make the API request
        print(f'Query: {query}')
        resp = requests.post(_url() + query, json={})
        if resp.status_code != 200:
          print(f'-> {resp.status_code}')
          failed_queries.append(query)
          continue
        resp = resp.json()
        query_sans_places = resp['debug']['query_with_places_removed']
        query_final = shared_utils.remove_stop_words(query_sans_places,
                                                     _ALL_STOP_WORDS)
        if not query_final:
          print('-> -EMPTY-')
          continue
        if query_final in added_queries:
          print('-> -DUP-')
          continue
        added_queries.add(query_final)
        print(f'-> "{query_final}"')
        writer.writerow([query_final])

  print(f'Output written to {output_file}')
  if failed_queries:
    open(output_file + '.FAILED', 'w').write('\n'.join(failed_queries))
    print(f'Failed queries written to {output_file}.FAILED')


def main(_):
  assert FLAGS.queryset and FLAGS.queryset_vars
  clean_vars(FLAGS.queryset, FLAGS.queryset_vars)


if __name__ == "__main__":
  app.run(main)
