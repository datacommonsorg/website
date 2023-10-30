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
Generate a summary in 2 sentences using only the information in the prompt.
Only list important highlights per table.
The summary should only be based on the information presented in the prompt. Do not include facts from other sources.
Please write in a professional and business-neutral tone.

Example:
- Houston is a city in Texas
- Ranked 1 of 793 cities in Texas by population
- Ranked 4 of 10288 cities in United States of America by population
- Population: 1990:1697873,1991:1707248,1992:1733420,1993:1756426,1994:1774143,1995:1779124,1996:1791508,1997:1807363,1998:1829098,1999:1845967,2000:1977408,2001:1994315,2002:2015621,2003:2019727,2004:2017358,2005:2021875,2006:2058724,2007:2065128,2008:2084441,2009:2118595,2010:2097647,2011:2123298,2012:2158700,2013:2196367,2014:2238653,2015:2283616,2016:2306360,2017:2313079,2018:2314478,2019:2315720,2020:2300027,2021:2288250
Summary: Houston, Texas is the most populous city in Texas and the fourth largest in the United States. The population of Houston has increased from 1697873 in 1990 to 2288250 in 2021.

Example:
- city: Arapahoe, NE
- Ranked 2 of 2 cities in Furnas County by Population
- Ranked 111 of 111 cities in Nebraska by Population
- Ranked 10275 of 10288 cities in United States of America by Population
- Population: 1990: 1011, 1991: 1007, 1992: 1017, 1993: 1023, 1994: 1009, 1995: 996, 1996: 976, 1997: 973, 1998: 974, 1999: 967, 2000: 1027, 2001: 1004, 2002: 1000, 2003: 979, 2004: 952, 2005: 931, 2006: 920, 2007: 897, 2008: 880, 2009: 882, 2010: 1025, 2011: 1022, 2012: 1015, 2013: 1005, 2014: 1010, 2015: 1001, 2016: 989, 2017: 992, 2018: 975, 2019: 983, 2020: 981, 2021: 982
Summary: Arapahoe is a city in Furnas County, Nebraska. It is the least populous city in Furnas County and Nebraska, and the 13th least populous city in the United States. The population of Arapahoe, NE has fluctuated over the years, with a peak of 1027 in 2000 and a low of 880 in 2008. The population has been increasing since 2010, reaching 982 in 2021.

Prompt:
- {place_type}: {place_name}
{ranking_data}
- {ranking_key}: {data_table}

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
  logging.debug(prompt)
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
    key = strip_superlatives(ranking_key)
    prompt_keys = {
        "place_type": place_type,
        "place_name": place_name,
        "ranking_key": key,
        "ranking_data": '\n'.join([f"- {ranking} by {key}" for ranking in rankings[ranking_key]]),
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
