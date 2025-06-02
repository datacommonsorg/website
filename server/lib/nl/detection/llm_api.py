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
"""Interface to LLM API for detection"""

import json
import time
from typing import Callable, Dict, List

from flask import current_app
import json5
import requests

from server.lib.nl.common import counters

_GEMINI_PRO_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent"
_API_HEADER = {'content-type': 'application/json'}

# TODO: Consider tweaking this. And maybe consider passing as url param.
_TEMPERATURE = 0.1

_GEMINI_REQ_DATA = {
    'contents': [{
        'parts': [{
            'text': '',
        }],
    }],
    'generationConfig': {
        'temperature': _TEMPERATURE,
    },
    'safetySettings': [
        {
            "category": "HARM_CATEGORY_HARASSMENT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            "category": "HARM_CATEGORY_HATE_SPEECH",
            "threshold": "BLOCK_ONLY_HIGH"
        },
        {
            "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        },
    ]
}

_SKIP_BEGIN_CHARS = ['`', '*']


def detect_with_geminipro(query: str, history: List[List[str]],
                          ctr: counters.Counters) -> Dict:
  req_data = _GEMINI_REQ_DATA.copy()

  text = current_app.config['LLM_PROMPT_TEXT'].gemini_pro + '\n\n'
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

  req_data['contents'][0]['parts'][0]['text'] = text

  start_time = time.time()
  req = json.dumps(req_data)
  # NOTE: llm_detector.detect() caller checks this.
  api_key = current_app.config['LLM_API_KEY']
  r = requests.post(f'{_GEMINI_PRO_URL_BASE}?key={api_key}',
                    data=req,
                    headers=_API_HEADER)
  resp = r.json()
  ctr.timeit('gemini_pro_call', start_time)

  return parse_response(query,
                        resp,
                        get_content_fn=extract_gemini_response,
                        ctr=ctr)


def extract_gemini_response(candidate: str) -> str:
  # https://ai.google.dev/tutorials/rest_quickstart#text-only_input
  return candidate.get('content', {}).get('parts', [{}])[0].get('text', '')


def parse_response(query: str, resp: Dict, get_content_fn: Callable[[str], str],
                   ctr: counters.Counters) -> Dict:
  if 'candidates' in resp and resp['candidates']:
    raw_content = resp['candidates'][0]
    content = get_content_fn(raw_content)
    ctr.info('info_llm_api_response', raw_content)
    ans = _extract_answer(content)
    if not ans:
      ctr.err('failed_llm_api_emptyparsedresult', content)
      return {}

    try:
      # Use json5 to load since it is a lot more lenient (e.g.,
      # allows trailing commas), even if ~600x slower (e.g.,
      # from 2us to 1.2ms for one loads).
      # But with current LLM latencies that's fine.
      ans_json = json5.loads(ans, allow_duplicate_keys=False)
    except Exception as e:
      ctr.err('failed_llm_api_jsondecodeerror', ans)
      return {}

    return ans_json
  elif resp.get('filters') and 'reason' in resp['filters'][0]:
    ctr.err('failed_llm_api_filtered_resp', resp)
    return {'UNSAFE': True}

  if "error" not in resp:
    # TODO: Unclear why this occasionally happens.
    ctr.err('failed_llm_api_empty_noerr', resp)
  else:
    ctr.err('failed_llm_api_empty', f'{query} -> {resp["error"]}')
  return {}


_UNSAFE_SIGNAL_WORDS = [
    'adult',
    'biased',
    'discriminatory',
    'harmful',
    'hate',
    'offensive',
    'problem',
    'racist',
    'respectful',
    'sexist',
    'stereotype',
    'violence',
]


def _extract_answer(resp: str) -> str:
  ans = []

  num_code_block_delims = 0
  for l in resp.splitlines():
    l = l.strip()
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
