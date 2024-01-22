# Copyright 2024 Google LLC
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

import os
import json
import logging
import requests
from typing import Dict, List

_API_KEY = os.getenv("MIXER_API_KEY")
assert _API_KEY, "$MIXER_API_KEY must be specified."

_OUTPUT_FILENAME = "place_summary_content.json"

_STAT_VAR_JSON = "stat_vars_detailed.json"

# What rank, top-X or bottom-X to have statistic highlighted.
_DEFAULT_RANKING_THRESHOLD = 3

# What % of top or bottom needed to have statistic highlighted.
# Number from 0 to 1.
_DEFAULT_PERCENTAGE_THRESHOLD = 0.10


# Categories of variables to skip
_CATEGORY_SKIP_LIST = [
  "Ignored", # Presents bad image in summaries
  "Crime", # Presents bad image in summaries
  "Education", # Vars not interesting
]

# DCID of the variable to use for population / per capita denominator
_POPULATION_DCID = "Count_Person"

_TEMPLATE_STARTING_SENTENCE = "{place_name} is a {place_type} in {parent_place_name}."

_TEMPLATE_RANKING_SENTENCE = "{place_name} ranks {rank} in {parent_place_name} by {stat_var_name} ({value:,})."

_TEMPLATE_VALUE_SENTENCE = "The {stat_var_name} in {place_name} is {value:,}{date_str}."

_DATE_SUFFIX = "({date})"

_RANK_SUFFIX = {
  "1" : "st",
  "2" : "nd",
  "3" : "rd",
}

def get_rank_string(rank: int) -> str:
  """Converts rank number into a string like '1st' """
  rank_str = str(rank)
  last_digit = rank_str[-1]
  suffix = _RANK_SUFFIX.get(last_digit, "th")
  return rank_str + suffix

def get_ranking(stat_var_dcid: str, place_type: str, parent_place_dcid: str) -> Dict:
  req_url = f"https://datacommons.org/api/ranking/{stat_var_dcid}/{place_type}/{parent_place_dcid}"
  response = requests.get(req_url)
  if response.status_code == 200:
    return response.json()
  else:
    logging.error(f"unable to fetch ranking from {req_url}")
  return {}

def get_population(place_dcids: list) -> Dict:
  """Get mapping of place dcid -> population for per capita calculations"""
  raise NotImplementedError

def get_names(place_dcids: list) -> Dict:
  """Get mapping of place dcid -> name"""
  req_url = f"https://api.datacommons.org/v1/bulk/property/values/out?property=name&key={_API_KEY}&nodes="
  nodes = "&nodes=".join(place_dcids)
  req_url += nodes
  response = requests.get(req_url)
  if response.status_code == 200:
    names = {}
    res_data = response.json().get("data", [])
    for place in res_data:
      place_dcid = place.get("node", "")
      place_name_values = place.get("values", [])
      place_name = place_name_values[0].get("value", "")
      if place_dcid and place_name:
        names[place_dcid] = place_name
    return names
  else:
    logging.error(f"unable to fetch names from {req_url}")
  return {}

def get_all_places_in(place_type: str, parent_place_dcid: str) -> List:
  """Get list of dcids for all places in a parent place of a certain place type"""
  req_url = f"https://api.datacommons.org/v1/property/values/in/linked/{parent_place_dcid}/containedInPlace?value_node_type={place_type}&key={_API_KEY}"
  response = requests.get(req_url)
  if response.status_code == 200:
    child_place_list = response.json().get("values", [])
    all_places_in = []
    for place in child_place_list:
      place_dcid = place.get("dcid", "")
      if place_dcid:
        all_places_in.append(place_dcid)
    return all_places_in
  else:
    logging.error(f"unable to fetch names from v2/node api")
  return []

def get_all_parent_places(place_type: str, place_dcids: List[str]) -> List:
  """Get list of dcids for all parent places of a certain place type"""
  req_url = f"https://api.datacommons.org/v1/property/values/out/linked/{parent_place_dcid}/containedInPlace?value_node_type={place_type}&key={_API_KEY}"
  response = requests.get(req_url)
  if response.status_code == 200:
    child_place_list = response.json().get("values", [])
    all_places_in = []
    for place in child_place_list:
      place_dcid = place.get("dcid", "")
      if place_dcid:
        all_places_in.append(place_dcid)
    return all_places_in
  else:
    logging.error(f"unable to fetch names from v2/node api")
  return []

# TODO: assert place type passed in does match DCID provided
def initialize_summaries(place_dcids: List[str], names: Dict, place_type: str, parent_place_name: str) -> Dict:
  """Initialize mapping of place dcid -> summary with starter sentence."""
  summaries = {}
  for place_dcid in place_dcids:
    place_name = names[place_dcid]
    sentence = _TEMPLATE_STARTING_SENTENCE.format(place_name=place_name, place_type=place_type.lower(), parent_place_name=parent_place_name)
    summaries[place_dcid] = sentence
  return summaries

def format_stat_var_value(value: float, stat_var_data: Dict) -> str:
  """Format a stat var observation to print nicely in a sentence"""
  # Round to 2nd decimal place
  rounded_value = round(value, 2)
  unit = stat_var_data['unit']
  value_str = str(rounded_value)
  raise NotImplementedError

def build_ranking_based_summaries(place_type: str, parent_place_dcid: str):
  """Get a summary for all child places of a parent place, based on rankings.
  
  Builds a summary using templated sentences. A place's observations for a
  variable for that place is highlighted if they rank highly for that place.
  """
  child_places = get_all_places_in(place_type, parent_place_dcid)
  name_of = get_names(child_places + [parent_place_dcid])
  parent_place_name = name_of[parent_place_dcid]
  if parent_place_dcid=="country/USA":
    # USA needs "the" in front in sentences.
    parent_place_name = "the United States of America"
  #population_of = get_population(child_places)
  summaries = initialize_summaries(child_places, name_of, place_type, parent_place_name)


  # Process each variable
  with open(_STAT_VAR_JSON) as sv_f:
    sv_data = json.load(sv_f)

    for category, sv_list in sv_data.items():

      if category in _CATEGORY_SKIP_LIST:
        continue

      for sv in sv_list:
        # Get ranking for variable
        sv_rankings = get_ranking(
          stat_var_dcid=sv["sv"],
          place_type=place_type,
          parent_place_dcid=parent_place_dcid)

        rank_list = sv_rankings.get(sv["sv"], {}).get("rankAll", {}).get("info", [])
        rank_list.sort(key=lambda x: x['rank'])

        # Add summaries for top places
        for i in range(len(rank_list)):
          rank_item = rank_list[i]
          place_dcid = rank_item['placeDcid']

          if i < _DEFAULT_RANKING_THRESHOLD:
            sentence = _TEMPLATE_RANKING_SENTENCE.format(
              place_name=name_of[place_dcid],
              rank=get_rank_string(rank_item['rank']),
              parent_place_name=parent_place_name,
              stat_var_name=sv['name'],
              value=rank_item['value'],
            )
            summaries[place_dcid] += " " + sentence

          elif i <= len(rank_list)*_DEFAULT_PERCENTAGE_THRESHOLD:
            sentence = _TEMPLATE_VALUE_SENTENCE.format(
              stat_var_name=sv['name'],
              place_name=name_of[place_dcid],
              value=rank_item['value'],
              date_str=""
            )
            summaries[place_dcid] += " " + sentence

  # Write summaries to file
  with open(_OUTPUT_FILENAME, "w") as out_file:
    json.dump(summaries, out_file, indent=4)


if __name__ == "__main__":
  build_ranking_based_summaries(
    place_type="State",
    parent_place_dcid="country/USA"
  )