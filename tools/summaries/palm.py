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
from typing import Dict, List

import requests

_API_KEY = os.getenv("LLM_API_KEY")
_API_URL = "https://generativelanguage.googleapis.com/v1beta3/models/text-bison-001:generateText"
_TEMPERATURE = 0.2

_PLACE_TYPE_PLURAL = {
    "city": "cities",
    "state": "states",
}

_POPULATION_EXAMPLE = """
Ranked 1 of cities in Texas by population. Summary: Most populous city in Texas.
Ranked 4 of cities in United States of America by population. Summary: 4th most populous city in United States.
"""

_SERIES_PROMPT = """
Generate a summary in 2 sentences using only the information in the prompt.
Only list important highlights per table.
The summary should only be based on the information presented in the prompt. Do not include facts from other sources.
Please write in a professional and business-neutral tone.

Examples: {examples}

Prompt:
- {place_type}: {place_name}
- {ranking}
- Values: {timeseries}

Summary:
"""

_RESUMMARIZE_PROMPT = """
Summarize these facts into 1 paragraph.
Start by introducing the place.
The summary should only be based on the information presented in these facts. Do not include facts from other sources.
Please write in a professional and business-neutral tone.

Facts:
{facts}

Summary:
"""

assert _API_KEY, "$LLM_API_KEY must be specified."


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
  generated_text = response.get("candidates", [{}])[0].get("output", "")
  logging.info(generated_text)
  return generated_text


def get_summary(place_name: str, place_type: str, sv_list: List, rankings: Dict,
                data_tables: List):
  """Generates an overview summary for a place"""
  place_parents = rankings['parents']
  # parent_dcid -> { dcid, name, place_type }
  parent_info = {}
  for parent in reversed(place_parents):
    parent_info[parent['dcid']] = parent

  # Select sv's - naively keep any sv that is in the top 5, preferring country > state > county.
  kept_rankings = {}
  for sv in sv_list:
    for parent in reversed(place_parents):
      parent_dcid = parent['dcid']
      sv_rank = rankings[parent_dcid].get('data', {}).get(sv, None)
      if not sv_rank:
        continue
      if sv_rank['rankFromTop'] < 5:
        sv_rank['parent'] = parent_dcid
        if not kept_rankings.get(sv, None):
          kept_rankings[sv] = sv_rank
        break
  logging.debug(kept_rankings)

  place_type_plural = _PLACE_TYPE_PLURAL[place_type]
  candidates = []
  prompts = []
  for sv, rank_info in kept_rankings.items():
    # TODO: Pull in SV titles from KG
    ranking_text = f"Ranked {rank_info['rankFromTop']} of {place_type_plural} in {parent_info[rank_info['parent']]['name']} by {sv}"
    logging.debug(ranking_text)

    # TODO: append unit if applicable
    timeseries = data_tables[sv].get('val', {})
    logging.debug(timeseries)

    prompt = _SERIES_PROMPT.format(examples=_POPULATION_EXAMPLE,
                                   place_type=place_type,
                                   place_name=place_name,
                                   ranking=ranking_text,
                                   timeseries=timeseries)
    prompts.append(f"{ranking_text}\n{timeseries}")
    response = request_palm(prompt)
    candidates.append("- " + response)

    # TODO: Add some verification step here

  facts = '\n'.join(candidates)
  prompt = _RESUMMARIZE_PROMPT.format(facts=facts)
  response = request_palm(prompt)
  prompts.append(facts)

  return prompts, response
