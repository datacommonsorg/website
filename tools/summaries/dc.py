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

_API_BASE_URL = "https://browser.datacommons.org/api/place/ranking"
_RANKINGS_HEADER = "Rankings (in)"
_LABEL_KEY = "label"


def get_ranking_csv(dcid: str):
  url = f"{_API_BASE_URL}/{dcid}"
  response = requests.get(url).json()
  logging.debug("Ranking response:\n%s", json.dumps(response, indent=True))
  csv = []
  for variable, places in response.items():
    if variable == _LABEL_KEY:
      continue

    row = {_RANKINGS_HEADER: variable}
    csv.append(row)
    for place in places:
      rank = place["data"]
      row[place[
          "name"]] = f"{rank['rankFromTop']} of {rank['rankFromTop'] + rank['rankFromBottom']}"

  return pd.DataFrame(csv).to_csv(index=False)
