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

import csv

from absl import app
from absl import flags
import requests

FLAGS = flags.FLAGS

flags.DEFINE_string('queryset', '', 'Full path to queryset CSV')

_OUTPUT_FILE = 'latency_results.csv'
_URL = 'https://dev.datacommons.org/nodejs/query?q='


def load_test(query_file, output_file):
  with open(output_file, 'w') as outf:
    writer = csv.writer(outf)
    writer.writerow([
        'Result', 'Query', 'NumCharts', 'ChartTypes', 'NLTime', 'TileLoadTime',
        'TotalTime'
    ])
    with open(query_file) as inf:
      for row in csv.reader(inf):
        if not row:
          continue
        query = row[0].strip()
        if not query or query.startswith('#') or query.startswith('//'):
          continue
        assert ';' not in query, 'Multiple query not yet supported'

        # Make the API request
        print(f'Query: {query}')
        response = requests.get(_URL + query)

        # Check the response status code
        if response.status_code == 200:
          # Parse the JSON response
          data = response.json()
          if not data.get('charts'):
            writer.writerow(['EMPTY', query, "0", "", 0, 0, 0])
            continue
          chart_types = list(set([c['type'] for c in data['charts']]))
          writer.writerow([
              'SUCCESS', query,
              str(len(data['charts'])), chart_types,
              data['debug']['timing'].get('getNlResult', 0),
              data['debug']['timing'].get('getTileResults', 0),
              data['debug']['timing'].get('total', 0)
          ])
        else:
          print("Request failed with status code:", response.status_code)
          writer.writerow(
              ['FAILURE', query, "0", "",
               str(response.status_code)])
  print('')
  print(f'Output written to {output_file}')
  print('')


def main(_):
  assert FLAGS.queryset
  load_test(FLAGS.queryset, _OUTPUT_FILE)


if __name__ == "__main__":
  app.run(main)
