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

import asyncio
import csv

from absl import app
from absl import flags
import aiohttp
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


# Runs regular load test where each query is requested one by one
def load_test(query_file, output_file):
  with open(output_file, 'w') as outf:
    writer = csv.writer(outf)
    writer.writerow(_RESULT_HEADER_ROW)
    with open(query_file) as inf:
      for row in csv.reader(inf):
        query = _get_query(row)
        if not query:
          continue

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


# Asynchronous function to run a query and add result of the run to results
async def run_query(results, key, session, query):
  try:
    print(f'Query {key}: {query}')
    response = await session.get(_URL + query)
    # Check the response status code
    if response.status == 200:
      # parse the json response and add to the result
      data = await response.json()
      print(f'Query {key} completed successfully')
      debug_timing = data.get('debug', {}).get('timing', {})
      charts = data.get('charts', [])
      chart_types = list(set([c['type'] for c in charts]))
      results[key] = {
          _RESULT_KEY_STATUS: 'EMPTY' if len(charts) == 0 else 'SUCCESS',
          _RESULT_KEY_QUERY: query,
          _RESULT_KEY_NUM_CHARTS: str(len(data['charts'])),
          _RESULT_KEY_CHART_TYPES: chart_types,
          _RESULT_KEY_NL_TIME: debug_timing.get('getNlResult', 0),
          _RESULT_KEY_TILE_TIME: debug_timing.get('getTileResults', 0),
          _RESULT_KEY_TOTAL_TIME: debug_timing.get('total', 0)
      }
    else:
      print(f'Query {key} failed with status code:', response.status_code)
      results[key] = {
          _RESULT_KEY_STATUS: 'FAILURE',
          _RESULT_KEY_QUERY: query,
      }
  except Exception as e:
    print(f'Error running query {key}: {str(e)}')
    results[key] = {
        _RESULT_KEY_STATUS: 'FAILURE',
        _RESULT_KEY_QUERY: query,
    }


# Runs asynchronous load test where all the queries are requested in parallel
async def run_async_load_test(query_file, output_file):
  results = {}
  result_keys = []
  async with aiohttp.ClientSession() as session:
    with open(query_file) as inf:
      tasks = []
      # Run each query in the query_file
      for i, row in enumerate(csv.reader(inf)):
        query = _get_query(row)
        if not query:
          continue
        result_keys.append(i)
        tasks.append(run_query(results, i, session, query))
      # Wait for the results of all the query runs
      await asyncio.gather(*tasks, return_exceptions=True)
      # Write the results to the output_file
      with open(output_file, 'w') as outf:
        writer = csv.writer(outf)
        writer.writerow(_RESULT_HEADER_ROW)
        for i in result_keys:
          i_result = results.get(i, {})
          result_row = []
          for row_key in _RESULT_HEADER_ROW:
            result_row.append(i_result.get(row_key, ''))
          writer.writerow(result_row)
      print('')
      print(f'Output written to {output_file}')
      print('')


def main(_):
  assert FLAGS.queryset
  if FLAGS.run_async:
    asyncio.run(run_async_load_test(FLAGS.queryset, _ASYNC_OUTPUT_FILE))
  else:
    load_test(FLAGS.queryset, _REGULAR_OUTPUT_FILE)


if __name__ == "__main__":
  app.run(main)
