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

_POPULATION_EXAMPLE = """
Ranked 1 of 793 cities in Texas by population. Summary: Most populous city in Texas.
Ranked 4 of 10288 cities in United States of America by population. Summary: 4th most populous city in United States.
Ranked 2 of 2 cities in Furnas County by Population. Summary: Least populous city in Furnas County.
Ranked 110 of 111 cities in Nebraska by population. Summary: 2nd least populous city in Nebraska.
Ranked 10275 of 10288 cities in United States of America by Population. Summary: 14th least populous city in United States.
Ranked 10276 of 10288 cities in United States of America by Population. Summary: 13th least populous city in United States.
Ranked 10277 of 10288 cities in United States of America by Population. Summary: 12th least populous city in United States.
Ranked 791 of 793 cities in Texas by population. Summary: 3rd least populous in Texas.
Ranked 3 of 3 cities in St Johns County by Population. Summary: Least populous city in St Johns County.
Ranked 339 of 339 cities in Missouri by population. Summary: Least populous city in Missouri.
"""

_FIXME = """
Ranked 1 of 793 cities in Texas by population. Summary: Most populous city in Texas.
Ranked 4 of 10288 cities in United States of America by median income. Summary: City with 4th highest median income in United States.
Ranked 2 of 2 cities in Furnas County by Population. Summary: Least populous city in Furnas County.
Ranked 110 of 111 cities in Nebraska by Median age. Summary: City with 2nd lowest median age in Nebraska.
Ranked 10275 of 10288 cities in United States of America by Population. Summary: 14th least populous city in United States.
Ranked 791 of 793 cities in Texas by median income. Summary: City with 3rd lowest median income in Texas.
Ranked 339 of 339 cities in Missouri by median age. Summary: Youngest city in Missouri by median age.
"""

_SERIES_PROMPT = """
Generate a summary in 2 sentences using only the information in the prompt.
Only list important highlights per table.
The summary should only be based on the information presented in the prompt. Do not include facts from other sources.
Please write in a professional and business-neutral tone.

Examples: {examples}

Prompt:
- {place_type}: {place_name}
{ranking_data}

Summary:
"""
# - {ranking_key}: {data_table}

_RESUMMARIZE_PROMPT = """
Summarize these facts into 1 paragraph.
Start by introducing the place.
The summary should only be based on the information presented in these facts. Do not include facts from other sources.
Please write in a professional and business-neutral tone.

Facts:
{facts}

Summary:
"""

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

Facts:
{facts}

Summary:
"""

assert _API_KEY, "$PALM_API_KEY must be specified."

# Ranking key -> data_table key
_TABLE_KEYS = {
    "Largest Population": "Count_Person",
    # "Highest Median Income": "Median_Income_Person",
    # "Highest Median Age": "Median_Age_Person",
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
  logging.info(prompt)
  response = requests.post(url=url, json=params, headers=headers).json()
  logging.info(response.get("candidates", [{}])[0].get("output", ""))
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
    key = strip_superlatives(ranking_key)
    prompt_keys = {
        "examples": _POPULATION_EXAMPLE,
        "place_type": place_type,
        "place_name": place_name,
        # "ranking_key": key,
        "ranking_data": '\n'.join([f"- {ranking} by {key}" for ranking in rankings[ranking_key]]),
        # "data_table": data_tables[data_table_key]
    }
    prompt = _SERIES_PROMPT.format(**prompt_keys)
    # prompts.append(prompt)
    prompts.append(
        '\n'.join([f"- {ranking} by {key}" for ranking in rankings[ranking_key]]) +
        data_tables[data_table_key])

    response = request_palm(prompt)
    candidates.append("- " + response)

    # TODO: Add some verification step here

  # facts = '\n'.join(candidates)
  # prompt = _RESUMMARIZE_PROMPT.format(facts=facts)
  # response = request_palm(prompt)
  # # prompts.append(prompt)
  # prompts.append(facts)

  return prompts, response
