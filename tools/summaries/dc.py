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

from absl import flags
import pandas as pd
import requests

FLAGS = flags.FLAGS

flags.DEFINE_string('dc_base_url', 'https://datacommons.org',
                    'DC instance to query')

_RANKING_URL = "{host}/api/place/ranking/{dcid}?all=1"
_PLACE_DATA_URL = "{host}/api/landingpage/data/{dcid}?category=Overview&hl=en&seed=0"
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


def get_ranking_data(dcid: str, place_type: str):
  """Returns ranking data as a list, keyed by rank label"""
  url = _RANKING_URL.format(host=FLAGS.dc_base_url, dcid=dcid)
  response = requests.get(url).json()
  logging.debug("Ranking response:\n%s", json.dumps(response, indent=True))
  data = {}
  place_type_plural = _PLACE_TYPE_PLURAL[place_type]
  for variable, places in response.items():
    if variable == _LABEL_KEY:
      continue

    data[variable] = []
    for place in places:
      rank = place["data"]
      data[variable].append(
          f"Ranked {rank['rankFromTop']} of {rank['rankFromTop'] + rank['rankFromBottom'] - 1} {place_type_plural} in {place['name']}"
      )

  return data


def get_data_series(dcid: str, place_name: str):
  """Returns series data as a CSV keyed by stat var"""
  url = _PLACE_DATA_URL.format(host=FLAGS.dc_base_url, dcid=dcid)
  response = requests.get(url).json()

  prompt_tables = {}

  for category, sv_titles in _SERIES_TO_KEEP.items():
    category_data = response["pageChart"]["Overview"].get(category, {})
    for chart_block in category_data:
      block_title = chart_block["title"]
      if block_title in sv_titles:
        sv = sv_titles[block_title]
        series = chart_block["trend"]["series"]

        # Convert dict into a csv with sorted date keys
        j = json.dumps(series, sort_keys=True)
        j = j.replace("'", '"')  # Needed for pd.read_json
        j = j.replace(sv, f"{block_title} in {place_name}")
        df = pd.read_json(j)
        prompt_tables[sv] = 'date' + df.to_csv()

  logging.debug(prompt_tables)
  return prompt_tables
