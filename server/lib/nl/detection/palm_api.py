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
from typing import Dict, List

from flask import current_app
import json5
import requests

from server.lib.nl.common import counters

_CHAT_API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta2/models/chat-bison-001:generateMessage"
_TEXT_API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText"
_API_HEADER = {'content-type': 'application/json'}

_SUFFIX = '\n\nIn your response, include just the JSON adhering to the above schema. Do not add JSON keys outside the schema.  Also, explain why you set specific enum values.'

# TODO: Consider tweaking this. And maybe consider passing as url param.
_TEMPERATURE = 0.1

_CANDIDATE_COUNT = 1

_CHAT_REQ_DATA = {
    'prompt': {
        'messages': {},
        'examples': [],
    },
    'temperature': _TEMPERATURE,
    'candidateCount': _CANDIDATE_COUNT,
}

_TEXT_REQ_DATA = {
    "prompt": {},
    "temperature":
        _TEMPERATURE,
    "candidateCount":
        _CANDIDATE_COUNT,
    "safetySettings": [{
        "category": "HARM_CATEGORY_UNSPECIFIED",
        "threshold": "BLOCK_ONLY_HIGH"
    }, {
        "category": "HARM_CATEGORY_DEROGATORY",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    }, {
        "category": "HARM_CATEGORY_TOXICITY",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    }, {
        "category": "HARM_CATEGORY_MEDICAL",
        "threshold": "BLOCK_ONLY_HIGH"
    }, {
        "category": "HARM_CATEGORY_DANGEROUS",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    }, {
        "category": "HARM_CATEGORY_VIOLENCE",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    }, {
        "category": "HARM_CATEGORY_SEXUAL",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    }]
}

_SKIP_BEGIN_CHARS = ['`', '*']


def check_safety_via_chat(query: str, ctr: counters.Counters) -> Dict:
  req_data = _CHAT_REQ_DATA.copy()

  req_data['prompt']['context'] = current_app.config[
      'PALM_PROMPT_TEXT'].safety_chat
  # For the first query in the session.
  q = 'Convert this sentence to JSON: "' + query + '"'
  req_data['prompt']['messages']['content'] = q

  start_time = time.time()
  req = json.dumps(req_data)
  # NOTE: llm_detector.detect() caller checks this.
  api_key = current_app.config['PALM_API_KEY']
  r = requests.post(f'{_CHAT_API_URL_BASE}?key={api_key}',
                    data=req,
                    headers=_API_HEADER)
  resp = r.json()
  ctr.timeit('palm_api_call', start_time)

  return parse_response(query, resp, field='content', ctr=ctr)


def detect_via_text(query: str, history: List[List[str]],
                    ctr: counters.Counters) -> Dict:
  req_data = _TEXT_REQ_DATA.copy()

  text = current_app.config['PALM_PROMPT_TEXT'].detection_text + '\n\n'
  if not history:
    # For the first query in the session.
    text += 'Convert this sentence to JSON: "' + query + '"'
  else:
    history_parts = []
    for input, output in history:
      history_parts.append(f'Sentence: {input}')
      history_parts.append(f'Response: {json.dumps(output)}')
      history_parts.append('')
    text += 'Here are list of past sentences:\n'
    text += '\n'.join(history_parts) + '\n\n'

    # For subsequent queries in the session.
    text += 'As a follow up to the last sentence, convert this sentence to JSON: "' + query + '"'

  req_data['prompt']['text'] = text

  start_time = time.time()
  req = json.dumps(req_data)
  # NOTE: llm_detector.detect() caller checks this.
  api_key = current_app.config['PALM_API_KEY']
  r = requests.post(f'{_TEXT_API_URL_BASE}?key={api_key}',
                    data=req,
                    headers=_API_HEADER)
  resp = r.json()
  ctr.timeit('palm_api_text_call', start_time)

  return parse_response(query, resp, field='output', ctr=ctr)


def detect_via_chat(query: str, history: List[List[str]],
                    ctr: counters.Counters) -> Dict:
  req_data = _CHAT_REQ_DATA.copy()

  req_data['prompt']['context'] = current_app.config[
      'PALM_PROMPT_TEXT'].detection_chat
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
  r = requests.post(f'{_CHAT_API_URL_BASE}?key={api_key}',
                    data=req,
                    headers=_API_HEADER)
  resp = r.json()
  ctr.timeit('palm_api_chat_call', start_time)

  return parse_response(query, resp, field='content', ctr=ctr)


def parse_response(query: str, resp: Dict, field: str,
                   ctr: counters.Counters) -> Dict:
  if 'candidates' in resp and resp['candidates']:
    raw_content = resp['candidates'][0]
    content = raw_content[field]
    ctr.info('info_palm_api_chat_response', raw_content)
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
  elif resp.get('filters') and 'reason' in resp['filters'][0]:
    ctr.err('failed_palm_api_filtered_resp', resp)
    return {'UNSAFE': True}

  if "error" not in resp:
    # TODO: Unclear why this occasionally happens.
    ctr.err('failed_palm_api_empty_noerr', resp)
  else:
    ctr.err('failed_palm_api_empty', f'{query} -> {resp["error"]}')
  return {}


_UNSAFE_SIGNAL_WORDS = [
    'adult',
    'biased',
    'cannot',
    'discriminatory',
    'harmful'
    'hate',
    'offensive',
    'problem',
    'racist',
    'respectful',
    'sexist',
    'stereotype',
    'unsafe',
    'violence',
    'will not',
]


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

  if not ans:
    # Sometimes the LLM refuses to set UNSAFE=true, but says
    # it won't return any response.  In that case, try to
    # use some heuristics to infer UNSAFE.
    resp = resp.lower()
    for w in _UNSAFE_SIGNAL_WORDS:
      if w in resp:
        return '{"UNSAFE": true}'

  return '\n'.join(ans)
