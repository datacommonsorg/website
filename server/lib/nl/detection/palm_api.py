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
import requests

from server.lib.nl.common import counters

_API_URL_BASE = f"https://generativelanguage.googleapis.com/v1beta2/models/chat-bison-001:generateMessage"
_API_HEADER = {'content-type': 'application/json'}

# TODO: Move this to a text file.
_PROMPT_CONTEXT_ORIG = \
("""You are going to be a super helpful assistant that will convert an english sentence to a JSON object.

The generated JSON object must conform to the following JSON Schema:

{
  "type": "object",
  "properties": {
    "PLACES": {
      "type": "array",
      "description": "Set to a list of substrings in the sentence that are places.  This must only have words found in the original sentence.",
      "items": { "type": "string" }
    },
    "METRICS": {
      "type": "array",
      "description": "Set to a list of substrings in the sentence that are metrics.",
      "items": { "type": "string" }
    },
    "DISASTER_EVENT": {
      "type": "string",
      "description": "Set if the sentence refers to a type of natural hazard like cyclones, earthquakes, floods, etc.",
      "enum":  [ "FIRE", "DROUGHT", "FLOOD", "CYCLONE", "EARTHQUAKE", "EXTREME_HEAT", "EXTREME_COLD", "HIGH_WETBULB_TEMPERATURE" ]
    },
    "RANK": {
      "type": "string",
      "description": "Set to HIGH, if the sentence includes has a superlative like most, highest, greatest, etc. Set to LOW, if sentence includes has superlatives like lowest, least, smallest, etc.",
      "enum":  [ "HIGH", "LOW" ]
    },
    "SUB_PLACE_TYPE": {
      "type": "string",
      "description": "Set to the specific place type mentioned in the sentence.",
      "enum": ["CITY", "COUNTY", "PROVINCE", "DISTRICT", "STATE", "COUNTRY", "HIGH_SCHOOL", "MIDDLE_SCHOOL", "ELEMENTARY_SCHOOL", "PUBLIC_SCHOOL"]
    },
    "COMPARE": {
      "type": "string",
      "description": "Set to COMPARE_PLACES if the sentence asks to compare multiple PLACES. Set to COMPARE_METRICS if the sentence asks to compare multiple METRICS.",
      "enum":  [ "COMPARE_PLACES", "COMPARE_METRICS" ]
    },
    "GROWTH": {
      "type": "string",
      "description": "Set to growth direction, INCREASE or DECREASE, if the sentence asks about growth of METRICS.",
      "enum":  [ "INCREASE", "DECREASE" ]
    },
    "SIZE": {
      "type": "string",
      "description": "Set to BIG or SMALL, if the sentence asks about the size of PLACES.",
      "enum": [ "BIG", "SMALL" ]
    },
    "COMPARISON_FILTER": {
      "type": "array",
      "description": "Represents the conditions used to filter places. Only `and` is supported as a logical operator.",
      "items": {
        "type": "object",
        "description": "Represents a condition made up of a COMPARISON_METRIC, COMPARISON_OPERATOR and VALUE.",
        "properties": {
          "COMPARISON_METRIC": {
            "type": "string",
            "description": "The metric to filter on"
          },
          "COMPARISON_OPERATOR": {
            "type": "string",
            "description": "Used to compare the COMPARISON_METRIC against the VALUE.",
            "enum": [ "EQUAL", "GREATER_THAN", "LESSER_THAN", "GREATER_THAN_OR_EQUAL", "LESSER_THAN_OR_EQUAL" ]
          },
          "VALUE": {
            "type": "number",
            "description": "Numeric value"
          }
        }
      }
    },
    "RANKING_FILTER": {
      "type": "array",
      "description": "Represents conditions that select the lowest or highest values of the RANKING_METRIC, like `where the hispanic population is lowest`.",
      "items": {
        "type": "object",
        "description": "Represents a single condition which is made up of a RANKING_METRIC and RANKING_OPERATOR.",
        "properties": {
          "RANKING_METRIC": {
            "type": "string",
            "description": "The metric to filter on"
          },
          "RANKING_OPERATOR": {
            "type": "string",
            "enum": ["IS_HIGHEST", "IS_LOWEST"]
          }
        }
      }
    }
  },
  "additionalProperties": false,
}

Here are some examples:

Input Sentences: "Tell me more about San Jose"
Output JSON:
```
{
  "PLACES": ["San Jose"]
}
```

Input Sentences: "States of USA"
Output JSON:
```
{
  "PLACES": ["USA"],
  "SUB_PLACE_TYPE": "STATE"
}
```

Input Sentences: "Most common diseases in San Jose"
Output JSON:
```
{
  "PLACES": ["San Jose"],
  "METRICS": ["diseases"],
  "RANK": "HIGH"
}
```

Input Sentence: "Counties in California with the fewest number of poor people"
Output JSON:
```
{
  "PLACES": ["california"],
  "METRICS": ["poor people"],
  "RANK": "LOW",
  "SUB_PLACE_TYPE": "COUNTY"
}
```

Input Sentence: "Compare obesity vs. blood pressure across US cities"
Output JSON:
```
{
  "PLACES": ["the US"],
  "METRICS": ["obesity", "blood pressure"],
  "SUB_PLACE_TYPE": "CITY",
  "COMPARE": "COMPARE_METRICS"
}
```

Input Sentence: "Give me info on prevalence of asthma, gender inequality and per capita hispanic population in nevada, california and north dakota"
Output JSON:
```
{
  "PLACES":  ["nevada", "california", "north dakota"],
  "METRICS": ["prevalence of asthma", "gender inequality", "per capita"],
  "COMPARE": "COMPARE_PLACES"
}
```

Input Sentence: "Countries of the world where poverty has increased the least?"
Output JSON:
```
{
  "PLACES":  ["world"],
  "METRICS": ["poverty"],
  "GROWTH": "INCREASE",
  "RANK": "LOW",
  "SUB_PLACE_TYPE": "COUNTRY"
}
```

Input Sentence: "how big are cities in california?"
Output JSON:
```
{
  "PLACES":  ["california"],
  "METRICS": ["size"],
  "SIZE": "BIG",
  "SUB_PLACE_TYPE": "CITY"
}
```

Input Sentence: "prevalence of asthma vs. temperature rise in US cities where median age is over 30 and income is under $100K."
Output JSON:
```
{
  "PLACES": ["US"],
  "METRICS": ["prevalence of asthma", "temperature rise"],
  "SUB_PLACE_TYPE": "CITY",
  "COMPARE": "COMPARE_METRICS",
  "COMPARISON_FILTER": [
    {
      "COMPARISON_METRIC": "median age",
      "COMPARISON_OPERATOR": "GREATER_THAN",
      "VALUE": 30
    },
    {
      "COMPARISON_METRIC": "income",
      "COMPARISON_OPERATOR": "LESSER_THAN",
      "VALUE": 100000
    }
  ]
}
```

Input Sentence: "Blood pressure prevalence in US cities with highest income levels"
Output JSON:
```
{
  "PLACES": ["US"],
  "METRICS": ["blood pressure prevalence"],
  "SUB_PLACE_TYPE": "CITY",
  "RANK": "HIGH",
  "RANKING_FILTER": [
    {
      "RANKING_METRIC": "income levels",
      "RANKING_OPERATOR": "IS_HIGHEST"
    }
  ]
}
```

Input Sentence: "What are some of the biggest floods in the US?"
Output JSON:
```
{
  "PLACES": ["US"],
  "RANK": "HIGH",
  "DISASTER_EVENT": "FLOOD"
}
```

Do not make up new JSON properties outside of the JSON Schema.
""")

_SUFFIX = '\n\nIn your response, include just the JSON adhering to the above schema. Do not add JSON keys outside the schema.  Also, explain why you set specific enum values.'

# TODO: Consider tweaking this. And maybe consider passing as url param.
_TEMPERATURE = 1.0

_CANDIDATE_COUNT = 1

_REQ_DATA = {
    'prompt': {
        'context': _PROMPT_CONTEXT_ORIG,
        'messages': {},
        'examples': [],
    },
    'temperature': _TEMPERATURE,
    'candidateCount': _CANDIDATE_COUNT,
}

_SKIP_BEGIN_CHARS = ['`', '*']


def call(query: str, history: str, ctr: counters.Counters) -> str:
  req_data = _REQ_DATA.copy()

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

  return _parse_response(query, resp, ctr)


def _parse_response(query: str, resp: Dict, ctr: counters.Counters) -> Dict:
  if 'candidates' in resp and resp['candidates']:
    content = resp['candidates'][0]['content']
    ans = _extract_ans(content)
    if not ans:
      ctr.err('failed_palm_api_emptyparsedresult', content)
      return {}

    try:
      ans_json = json.loads(ans)
    except json.decoder.JSONDecodeError as e:
      logging.error(f'ERROR: json decoding failed {e}')
      ctr.err('failed_palm_api_jsondecodeerror', ans)
      return {}

    return ans_json

  if "error" not in resp:
    # TODO: Unclear why this occasionally happens.
    logging.error('ERROR: Got empty response, not sure why this happens!')
    ctr.err('failed_palm_api_empty', query)
  else:
    logging.error(f'ERROR: {query} failed with {resp["error"]}')
    ctr.err('failed_palm_api_empty', f'{query} -> {resp["error"]}')
  return {}


def _extract_ans(resp: str) -> str:
  ans = []
  for l in resp.splitlines():
    if l and not l[0] in _SKIP_BEGIN_CHARS and not l[0].isalnum():
      ans.append(l)
  if len(ans) > 2 and ans[-2].strip().endswith(','):
    # Remove trailing ','
    ans[-2] = ans[-2].rstrip(', ')
  return '\n'.join(ans)
