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

import logging
import os
from typing import List

import requests

_API_KEY = os.getenv("PALM_API_KEY")
_API_URL = "https://generativelanguage.googleapis.com/v1beta3/models/text-bison-001:generateText"
_TEMPERATURE = 0.2

_SERIES_PROMPT = """
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

_RESUMMARIZE_PROMPT = """
Summarize these facts into 1 paragraph.
Start by introducing the place.
The summary should only be based on the information presented in these facts.
Please write in a professional and business-neutral tone.

Facts:
{facts}

Summary:
"""

assert _API_KEY, "$PALM_API_KEY must be specified."

# Ranking key -> data_table key
_TABLE_KEYS = {
    "Largest Population": "Count_Person",
    "Highest Median Income": "Median_Income_Person",
    "Highest Median Age": "Median_Age_Person",
}


def strip_superlatives(label: str) -> str:
  """Converts e.g. "Largest Population" -> "Population"."""
  label = label.replace("Highest", "")
  label = label.replace("Largest", "")
  return label.strip()


def request_palm(prompt):
  """Sends a summary request to PALM"""
  url = f"{_API_URL}?key={_API_KEY}"
  headers = {
      "Content-Type": "application/json",
  }
  params = {
      "prompt": {
          "text": prompt,
      },
      "temperature": _TEMPERATURE,
      "candidateCount": 1,
  }
  response = requests.post(url=url, json=params, headers=headers).json()
  return response.get("candidates", [{}])[0].get("output", "")


def get_summary(place_name: str, place_type: str, rankings: str,
                data_tables: List[str]):
  """Generates an overview summary for a place"""
  candidates = []
  prompts = []
  for ranking_key, data_table_key in _TABLE_KEYS.items():
    if not ranking_key in rankings:
      logging.info(f"Skipping {ranking_key} for {place_name}")
      continue
    if not data_table_key in data_tables:
      logging.info(f"Skipping {data_table_key} for {place_name}")
      continue
    prompt_keys = {
        "place_type": place_type,
        "place_name": place_name,
        "ranking_key": strip_superlatives(ranking_key),
        "ranking_data": '\n'.join(rankings[ranking_key]),
        "data_table": data_tables[data_table_key]
    }
    prompt = _SERIES_PROMPT.format(**prompt_keys)
    prompts.append(prompt)

    response = request_palm(prompt)
    candidates.append("- " + response)

    # TODO: Add some verification step here

  facts = '\n'.join(candidates)
  prompt = _RESUMMARIZE_PROMPT.format(facts=facts)
  response = request_palm(prompt)
  prompts.append(prompt)

  return prompts, response
