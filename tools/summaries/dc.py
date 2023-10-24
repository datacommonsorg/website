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

import json
import logging

import pandas as pd
import requests

# _API_BASE_URL = "https://datacommons.org/"
_API_BASE_URL = "http://localhost:8080/"
_RANKING_URL = _API_BASE_URL + "api/place/ranking/{dcid}"
_PLACE_DATA_URL = _API_BASE_URL + "/api/landingpage/data/{dcid}?category=Overview&hl=en&seed=0"
_RANKINGS_HEADER = "Rankings"
_LABEL_KEY = "label"

_SERIES_TO_KEEP = {
  "Demographics": {
    "Median Age": "Median_Age_Person",
    "Population": "Count_Person",
  },
  "Economics": {
    "Median individual income": "Median_Income_Person",
    # "Unemployment rate": "UnemploymentRate_Person",
  },
}

_PLACE_TYPE_PLURAL = {
  "city": "cities",
  "state": "states",
}

def get_ranking_csv(dcid: str, place_type: str):
  url = _RANKING_URL.format(dcid=dcid)
  response = requests.get(url).json()
  logging.debug("Ranking response:\n%s", json.dumps(response, indent=True))
  # csv = []
  data = {}
  place_type_plural = _PLACE_TYPE_PLURAL[place_type]
  for variable, places in response.items():
    if variable == _LABEL_KEY:
      continue

    variable = variable.replace("Highest", "")
    variable = variable.replace("Largest", "")
    variable = variable.strip()
    data[variable] = []
    # row = {_RANKINGS_HEADER: variable}
    # csv.append(row)
    for place in places:
      rank = place["data"]
      # row[place["name"]]
      data[variable].append(
      f"Ranked {rank['rankFromTop']} of {rank['rankFromTop'] + rank['rankFromBottom']} {place_type_plural} in {place['name']}")

  return data

  # return pd.DataFrame(csv).to_csv(index=False)


def get_data_series(dcid: str, place_name: str):
  url = _PLACE_DATA_URL.format(dcid=dcid)
  response = requests.get(url).json()

  prompt_tables = {}

  for category, sv_titles in _SERIES_TO_KEEP.items():
    category_data = response["pageChart"]["Overview"][category]
    for chart_block in category_data:
      block_title = chart_block["title"]
      if block_title in sv_titles:
        sv = sv_titles[block_title]
        # series = chart_block["trend"]["series"][sv]
        series = chart_block["trend"]["series"]
        # prompt_tables.append(f"{block_title} = {json.dumps(series)}")
        j = json.dumps( series , sort_keys=True)
        j = j.replace("'", '"')
        j = j.replace(sv, f"{block_title} in {place_name}")
        df = pd.read_json(j)
        prompt_tables[sv] = 'date' + df.to_csv()
        # prompt_tables.append('date' + df.to_csv())

  # add highlight stat
  pop_highlight = response["highlight"]["Population"]
  pop_date = pop_highlight["date"]
  pop_value = pop_highlight["data"][0]["data"]["Count_Person"]
  prompt_tables["Population"] = f"Population of {place_name} in {pop_date} is {pop_value}"

  logging.debug(prompt_tables)
  return prompt_tables