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
"""Interface to PaLM API for detection"""

import json
import logging
import time
from typing import Dict

from flask import current_app
import json5
import requests

from server.lib.nl.common import counters

_API_URL_BASE = f"https://generativelanguage.googleapis.com/v1beta2/models/chat-bison-001:generateMessage"
_API_HEADER = {'content-type': 'application/json'}

_SUFFIX = '\n\nIn your response, include just the JSON adhering to the above schema. Do not add JSON keys outside the schema.  Also, explain why you set specific enum values.'

# TODO: Consider tweaking this. And maybe consider passing as url param.
_TEMPERATURE = 1.0

_CANDIDATE_COUNT = 1

_REQ_DATA = {
    'prompt': {
        'messages': {},
        'examples': [],
    },
    'temperature': _TEMPERATURE,
    'candidateCount': _CANDIDATE_COUNT,
}

_SKIP_BEGIN_CHARS = ['`', '*']


def call(query: str, history: str, ctr: counters.Counters) -> Dict:
  req_data = _REQ_DATA.copy()

  req_data['prompt']['context'] = current_app.config['PALM_PROMPT_TEXT']
  if not history:
    # For the first query in the session.
    q = 'Convert this sentence to JSON: "' + query + '"'
  else:
    # For subsequent queries in the session.
    q = 'As a follow up to the last sentence, convert this sentence to JSON: "' + query + '"'
  req_data['prompt']['messages']['content'] = q + _SUFFIX

  for input, output in history:
    req_data['prompt']['examples'].append({
        'input': {
            'content': input
        },
        'output': {
            'content': json.dumps(output)
        }
    })

  start_time = time.time()
  req = json.dumps(req_data)
  # NOTE: llm_detector.detect() caller checks this.
  api_key = current_app.config['PALM_API_KEY']
  r = requests.post(f'{_API_URL_BASE}?key={api_key}',
                    data=req,
                    headers=_API_HEADER)
  resp = r.json()
  ctr.timeit('palm_api_call', start_time)

  return parse_response(query, resp, ctr)


def parse_response(query: str, resp: Dict, ctr: counters.Counters) -> Dict:
  if 'candidates' in resp and resp['candidates']:
    content = resp['candidates'][0]['content']
    ctr.info('info_palm_api_response', content)
    ans = _extract_answer(content)
    if not ans:
      logging.error(f'ERROR: empty parsed result for {query}')
      ctr.err('failed_palm_api_emptyparsedresult', content)
      return {}

    try:
      # Use json5 to load since it is a lot more lenient (e.g.,
      # allows trailing commas), even if ~600x slower (e.g.,
      # from 2us to 1.2ms for one loads).
      # But with current LLM latencies that's fine.
      ans_json = json5.loads(ans, allow_duplicate_keys=False)
    except Exception as e:
      logging.error(f'ERROR: json decoding failed {e}')
      ctr.err('failed_palm_api_jsondecodeerror', ans)
      return {}

    return ans_json

  if "error" not in resp:
    # TODO: Unclear why this occasionally happens.
    ctr.err('failed_palm_api_empty_noerr', query)
  else:
    ctr.err('failed_palm_api_empty', f'{query} -> {resp["error"]}')
  return {}


def _extract_answer(resp: str) -> str:
  ans = []

  num_code_block_delims = 0
  for l in resp.splitlines():
    if l and not l[0] in _SKIP_BEGIN_CHARS and not l[0].isalnum():
      ans.append(l)
    if l.startswith('```'):
      num_code_block_delims += 1

    # Sometimes LLM returns two sets of JSONs where the first one
    # is the answer and the second one is part of the explanation.
    # To handle that, just quit when we've found a pair of them.
    if num_code_block_delims == 2:
      break

  return '\n'.join(ans)
