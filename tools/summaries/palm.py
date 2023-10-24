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

from typing import List

import json
import logging
import os
import re

import dc
import requests

_API_KEY = os.getenv("PALM_API_KEY")
_API_URL = "https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText"
_TEMPERATURE = 0.2
# Sometimes the summaries may not be factual. Retry them in that case.
# We use a heuristic that the summary must contain at least 2 numbers to be factual.
_RETRIES = 2

_PROMPT = """
Generate a summary in 2 sentences using only the information from the following tables.
Only list important highlights per table.
The summary should only be based on the information presented in these tables.
Do not include facts from other sources.
Do not use superlatives.
Do not use the phrase 'According to the data'.
Do not include opinions.
Please include references if information is included from other sources.
Please write in a professional and business-neutral tone.

{place_type}: {place_name}

{ranking_key}:
{ranking_data}

Table:
{data_table}

Summary:
"""

assert _API_KEY, "$PALM_API_KEY must be specified."

# Ranking key -> data_table key
_TABLE_KEYS = {
  "Population": "Count_Person",
  "Median Income": "Median_Income_Person",
  "Median Age": "Median_Age_Person",
}


def get_summary(place_name: str, place_type: str, rankings: str, data_tables: List[str]):
  url = f"{_API_URL}?key={_API_KEY}"
  headers = {
      "Content-Type": "application/json",
  }

  candidates = []
  prompts = []
  for ranking_key, data_table_key in _TABLE_KEYS.items():
    if not ranking_key in rankings:
      logging.info(f"Skipping {ranking_key} for {place_name}")
      continue
    prompt_keys = {"place_type":place_type,
                 "place_name":place_name,
                 "ranking_key":ranking_key,
                 "ranking_data":rankings[ranking_key],
                 "data_table":data_tables[data_table_key]}
    prompt = _PROMPT.format(**prompt_keys)
    prompts.append(prompt)

    params = {
        "prompt": {
            "text": prompt,
        },
        "temperature": _TEMPERATURE,
        "candidateCount": 1,
    }
    response = requests.post(url=url, json=params, headers=headers).json()
    candidates.append(" -- " + response.get("candidates", [{}])[0].get("output", ""))

    # TODO: Add some verification step here

  facts = '\n'.join(candidates)
  prompt = f"""
  Summarize these facts into 1 paragraph.

  {facts}
  """
  params = {
      "prompt": {
          "text": prompt,
      },
      "temperature": _TEMPERATURE,
      "candidateCount": 1,
  }
  response = requests.post(url=url, json=params, headers=headers).json()
  prompts.append(prompt)

  return prompts, response.get("candidates", [{}])[0].get("output", "")

  for attempt in range(_RETRIES):
    response = requests.post(url=url, json=params, headers=headers).json()
    logging.debug("LLM response (attempt #%s):\n%s", attempt + 1,
                  json.dumps(response, indent=1))
    candidate = response.get("candidates", [{}])[0].get("output", "")
    # cd
    if re.search(r'(\d+).+(\d+)', candidate):
      return prompt, candidate
    if attempt == _RETRIES - 1:
      logging.warning("Summary may not be factual: %s", candidate)
      return prompt, candidate
    logging.warning("Retrying %s: %s", place_name, candidate)

  return prompt, ""
