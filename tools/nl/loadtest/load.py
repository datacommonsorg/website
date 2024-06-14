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

import concurrent.futures
import csv
import json

from absl import app
from absl import flags
import requests

FLAGS = flags.FLAGS

flags.DEFINE_string('instance', 'bard', 'The instance name of the website')
flags.DEFINE_integer('parallel_requests', 1,
                     'Number of requests to run in parallel')
flags.DEFINE_integer('total_requests', None, 'Total number of requests to run')
flags.DEFINE_string('apikey', '', "apikey to use when making query requests.")

_OUTPUT_FILE = 'load_results.json'
_QUERY_FILE = 'queryset.csv'
_URL = 'https://{instance}.datacommons.org/nodejs/query?apikey={apikey}&q={query}'
_RESULT_KEY_CODE = 'code'
_RESULT_KEY_ERROR_CONTENT = 'errorContent'
_RESULT_KEY_NL_TIME = 'nlTime'
_RESULT_KEY_TOTAL_TIME = 'totalTime'
_RESULT_KEY_TILE_TIME = 'tileTime'
session = requests.Session()


# Runs a single query and returns the response code.
def _run_query(query):
  # Make the API request
  print(f'Running query: {query}')
  try:
    url = _URL.format(instance=FLAGS.instance, apikey=FLAGS.apikey, query=query)
    response = session.get(url, timeout=None)
    if response.status_code == 200:
      debug_timing = response.json().get('debug', {}).get('timing', {})
      result = {
          _RESULT_KEY_CODE: str(response.status_code),
          _RESULT_KEY_NL_TIME: debug_timing.get('getNlResult'),
          _RESULT_KEY_TOTAL_TIME: debug_timing.get('total'),
          _RESULT_KEY_TILE_TIME: debug_timing.get('getTileResults'),
      }
      result.update(response.json().get('debug',
                                        {}).get('debug',
                                                {}).get('counters',
                                                        {}).get('TIMING', {}))
    return {
        _RESULT_KEY_CODE: str(response.status_code),
        _RESULT_KEY_ERROR_CONTENT: str(response.content)
    }
  except Exception as e:
    return {_RESULT_KEY_CODE: 'Exception', _RESULT_KEY_ERROR_CONTENT: str(e)}


# Get a list of queries
def _get_query_list():
  query_list = []
  with open(_QUERY_FILE) as inf:
    for row in csv.reader(inf):
      if not row:
        continue
      query = row[0].strip()
      if not query or query.startswith('#') or query.startswith('//'):
        continue
      assert ';' not in query, 'Multiple query not yet supported'
      query_list.append(query)
  return query_list


# Gets an empty time result object used for the output
def _get_empty_time_result():
  return {'avg': 0, 'max': 0, 'min': 0}


# Take the list of results from running the queries and get the result output
# object.
def _get_result_output(run_results):
  response_codes = {}
  times_seen = {}
  result = {
      _RESULT_KEY_NL_TIME: _get_empty_time_result(),
      _RESULT_KEY_TILE_TIME: _get_empty_time_result(),
      _RESULT_KEY_TOTAL_TIME: _get_empty_time_result(),
  }
  nl_debug_result = {
      'explore_more_existence_check': _get_empty_time_result(),
      'explore_more_sv_extensions': _get_empty_time_result(),
      'fulfillment': _get_empty_time_result(),
      'get_all_child_places': _get_empty_time_result(),
      'get_sv_details': _get_empty_time_result(),
      'query_detection': _get_empty_time_result(),
      'setup_for_explore': _get_empty_time_result(),
      'sv_existence_for_places': _get_empty_time_result(),
      'sv_existence_for_places_check_single_point': _get_empty_time_result(),
      'topic_calls': _get_empty_time_result(),
      'topic_expansion': _get_empty_time_result(),
  }

  error_content = {}
  for r in run_results:
    code = r.get(_RESULT_KEY_CODE)
    occ = response_codes.get(code, 0) + 1
    response_codes[code] = occ
    if r.get(_RESULT_KEY_ERROR_CONTENT):
      if not code in error_content:
        error_content[code] = {}
      content = r.get(_RESULT_KEY_ERROR_CONTENT)
      content_occurence = error_content[code].get(content, 0) + 1
      error_content[code][content] = content_occurence
    for result_dict in [result, nl_debug_result]:
      for k in result_dict.keys():
        if not r.get(k):
          continue
        num_seen = times_seen.get(k, 0) + 1
        times_seen[k] = num_seen
        time = float(r.get(k))
        result_dict[k]['max'] = max(time, result_dict[k]['max'])
        if result_dict[k]['min'] == 0:
          result_dict[k]['min'] = time
        else:
          result_dict[k]['min'] = min(time, result_dict[k]['min'])
        result_dict[k]['avg'] = result_dict[k]['avg'] * (
            num_seen - 1) / num_seen + time / num_seen
  result['nl_debug_timing'] = nl_debug_result
  result['codes'] = response_codes
  result['errors'] = error_content
  return result


# Runs a list of queries against _URL.
def run_load(total_requests, parallel_requests):
  query_list = _get_query_list()
  query_list_to_run = []
  # If number of total requests is specified, generate a list of queries that is
  # total requests long
  if total_requests:
    while len(query_list_to_run) < total_requests and len(query_list):
      num_missing = total_requests - len(query_list_to_run)
      query_list_to_run += query_list[0:min(num_missing, len(query_list))]
  else:
    query_list_to_run = query_list

  # Run each query, parallel_requests number of queries at a time & collect the
  # response codes from runnign each query.
  results = []
  with concurrent.futures.ThreadPoolExecutor(parallel_requests) as executor:
    results = executor.map(_run_query, query_list_to_run)

  # build the output json
  result_output = _get_result_output(results)

  # Write the output json to the output file
  with open(_OUTPUT_FILE, 'w') as outf:
    outf.write(json.dumps(result_output))


def main(_):
  run_load(FLAGS.total_requests, FLAGS.parallel_requests)


if __name__ == "__main__":
  app.run(main)
