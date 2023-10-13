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

assert _API_KEY, "$PALM_API_KEY must be specified."


def get_summary(name: str, ranking_csv: str, data_tables: List[str]):
  url = f"{_API_URL}?key={_API_KEY}"
  # prompt = f"Summarize the following CSV for {name} in 1 sentence. Don't use superlatives.\n\n{csv}"
  # prompt = f"Give me a one sentence NL summary based on the following info for {name}:\n\n{csv}"
  tables_for_prompt = "\n\nTable:\n".join(data_tables)
  prompt = f"""
  Generate a summary for {name} in 1 paragraph using only the information from the following tables.
  Only list important highlights per table.
  The summary should only be based on the information presented in these tables. Do not include facts from other sources.
  Do not return markdown or lists.
  Please write in a professional and business-neutral tone.
  Do not use the phrase 'According to the data'.
  Please include references if information is included from other sources. Do not include opinions.

  Table:
  {ranking_csv}

  Table:
  {tables_for_prompt}

  Summary:
  """
  logging.info(prompt)
  params = {
      "prompt": {
          "text": prompt
      },
      "temperature": _TEMPERATURE,
      "candidateCount": 1,
  }
  headers = {
      "Content-Type": "application/json",
  }

  for attempt in range(_RETRIES):
    response = requests.post(url=url, json=params, headers=headers).json()
    logging.debug("LLM response (attempt #%s):\n%s", attempt + 1,
                  json.dumps(response, indent=1))
    candidate = response.get("candidates", [{}])[0].get("output", "")
    if re.search(r'(\d+).+(\d+)', candidate):
      return candidate
    if attempt == _RETRIES - 1:
      logging.warning("Summary may not be factual: %s", candidate)
      return candidate
    logging.warning("Retrying %s: %s", name, candidate)

  return ""
