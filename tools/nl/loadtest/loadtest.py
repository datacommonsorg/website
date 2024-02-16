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

import concurrent.futures
import csv

from absl import app
from absl import flags
import requests

FLAGS = flags.FLAGS

flags.DEFINE_string('queryset', '', 'Full path to queryset CSV')
flags.DEFINE_bool('run_async', False,
                  'Whether or not to run the queries asynchronously')

_REGULAR_OUTPUT_FILE = 'loadtest_results.csv'
_ASYNC_OUTPUT_FILE = 'async_loadtest_results.csv'
_URL = 'https://dev.datacommons.org/nodejs/query?q='

_RESULT_KEY_STATUS = 'Result'
_RESULT_KEY_QUERY = 'Query'
_RESULT_KEY_NUM_CHARTS = 'NumCharts'
_RESULT_KEY_CHART_TYPES = 'ChartTypes'
_RESULT_KEY_NL_TIME = 'NLTime'
_RESULT_KEY_TILE_TIME = 'TileLoadTime'
_RESULT_KEY_TOTAL_TIME = 'TotalTime'
_RESULT_HEADER_ROW = [
    _RESULT_KEY_STATUS, _RESULT_KEY_QUERY, _RESULT_KEY_NUM_CHARTS,
    _RESULT_KEY_CHART_TYPES, _RESULT_KEY_NL_TIME, _RESULT_KEY_TILE_TIME,
    _RESULT_KEY_TOTAL_TIME
]


# Gets the query from a csv row
def _get_query(row):
  if not row:
    return None
  query = row[0].strip()
  if not query or query.startswith('#') or query.startswith('//'):
    return None
  assert ';' not in query, 'Multiple query not yet supported'
  return query


# Gets the result for a single query.
def run_query(query):
  # Make the API request
  print(f'Query: {query}')
  response = requests.get(_URL + query)
  # Check the response status code
  if response.status_code == 200:
    # parse the json response and add to the result
    data = response.json()
    debug_timing = data.get('debug', {}).get('timing', {})
    charts = data.get('charts', [])
    chart_types = list(set([c['type'] for c in charts]))
    print(f'Query completed: {query}')
    return {
        _RESULT_KEY_STATUS: 'EMPTY' if len(charts) == 0 else 'SUCCESS',
        _RESULT_KEY_QUERY: query,
        _RESULT_KEY_NUM_CHARTS: str(len(data['charts'])),
        _RESULT_KEY_CHART_TYPES: chart_types,
        _RESULT_KEY_NL_TIME: debug_timing.get('getNlResult', 0),
        _RESULT_KEY_TILE_TIME: debug_timing.get('getTileResults', 0),
        _RESULT_KEY_TOTAL_TIME: debug_timing.get('total', 0)
    }
  else:
    print(f'Query ({query}) failed with status code:', response.status_code)
    return {
        _RESULT_KEY_STATUS: 'FAILURE',
        _RESULT_KEY_QUERY: query,
    }


# Runs the load test
def load_test(query_file, output_file, run_async):
  # Get the list of queries
  query_list = []
  with open(query_file) as inf:
    query = _get_query
    for row in csv.reader(inf):
      query = _get_query(row)
      if not query:
        continue
      query_list.append(query)

  # Run each query from the list. If run_async is true, run all the queries
  # asynchronously. Otherwise, run them one by one.
  results = []
  num_threads = len(query_list) if run_async else 1
  with concurrent.futures.ThreadPoolExecutor(num_threads) as executor:
    results = executor.map(run_query, query_list)

  # Write the results to the output_file
  with open(output_file, 'w') as outf:
    writer = csv.writer(outf)
    writer.writerow(_RESULT_HEADER_ROW)
    for result in results:
      result_row = []
      for key in _RESULT_HEADER_ROW:
        result_row.append(result.get(key, ''))
      writer.writerow(result_row)
  print('')
  print(f'Output written to {output_file}')
  print('')


def main(_):
  assert FLAGS.queryset
  if FLAGS.run_async:
    load_test(FLAGS.queryset, _ASYNC_OUTPUT_FILE, True)
  else:
    load_test(FLAGS.queryset, _REGULAR_OUTPUT_FILE, False)


if __name__ == "__main__":
  app.run(main)
