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

import json
import logging
import os
from typing import Dict, List

import requests

_API_KEY = os.getenv("MIXER_API_KEY")
assert _API_KEY, "$MIXER_API_KEY must be specified."

# Where to write output json summaries to
_OUTPUT_FILENAME = "place_summary_content_states.json"

# Where to read stat var specs from
_STAT_VAR_JSON = "stat_vars_detailed.json"

# What rank, top-X or bottom-X to have statistic highlighted.
_DEFAULT_RANKING_THRESHOLD = 3

# What % of top or bottom needed to have statistic highlighted.
# Number from 0 to 1.
_DEFAULT_PERCENTAGE_THRESHOLD = 0.10

# Categories of variables to skip
_CATEGORY_SKIP_LIST = [
    "Ignored",  # Presents bad image in summaries
    "Crime",  # Presents bad image in summaries
    "Education",  # Vars not interesting
]

# List of place types to mention in starting sentence.
_PLACE_HIERARCHY = [
  "City",
  "County",
  "State",
  "Country",
  "Continent",
]

# DCID of the variable to use for population / per capita denominator
_POPULATION_DCID = "Count_Person"

# Template for the first sentence in the summary
_TEMPLATE_STARTING_SENTENCE = "{place_name} is a {place_type} in {parent_place_name}."

# Template for stat var a place ranks highly in
_TEMPLATE_RANKING_SENTENCE = "{place_name} ranks {rank} in {parent_place_name} by {stat_var_name} ({value})."

# Template for sharing the value of a stat var
_TEMPLATE_VALUE_SENTENCE = "The {stat_var_name} in {place_name} is {value}{date_str}."

# Template for how to display a date in sentences above
_TEMPLATE_DATE = " ({date})"

# Mapping of suffix to use when displaying a ranking
_RANK_SUFFIX = {
    "1": "st",
    "2": "nd",
    "3": "rd",
}


def get_rank_string(rank: int) -> str:
  """Converts rank number into a string like '1st' """
  rank_str = str(rank)
  last_digit = rank_str[-1]
  suffix = _RANK_SUFFIX.get(last_digit, "th")
  return rank_str + suffix


def get_ranking(stat_var_dcid: str, place_type: str,
                parent_place_dcid: str) -> Dict:
  """Make ranking api call and return response"""
  req_url = f"https://datacommons.org/api/ranking/{stat_var_dcid}/{place_type}/{parent_place_dcid}"
  response = requests.get(req_url)
  if response.status_code == 200:
    response_data = response.json().get(stat_var_dcid, {})
    ranking_key = list(response_data.keys())[0] if response_data.keys() else ""
    rank_list = response_data.get(ranking_key, {}).get("info", [])
    if rank_list:
        rank_list.sort(key=lambda x: x['rank'])
    return rank_list
  else:
    logging.error(f"unable to fetch ranking from {req_url}")
  return {}


def get_population(place_dcids: list) -> Dict:
  """Get mapping of place dcid -> population for per capita calculations"""
  raise NotImplementedError


def get_names(place_dcids: list) -> Dict:
  """Get mapping of place dcid -> name"""
  req_url = f"https://api.datacommons.org/v1/bulk/property/values/out?property=name&key={_API_KEY}&nodes="
  req_url += "&nodes=".join(place_dcids)
  response = requests.get(req_url)
  if response.status_code == 200:
    # Format response into dcid -> name dictionary
    names = {}
    res_data = response.json().get("data", [])
    for place in res_data:
      place_dcid = place.get("node")
      place_name_values = place.get("values")
      place_name = place_name_values[0].get("value", "") if place_name_values else None
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
    # Format response into a list of dcids
    child_place_list = response.json().get("values", [])
    all_places_in = []
    for place in child_place_list:
      if place.get("dcid"):
        all_places_in.append(place.get("dcid"))
    return all_places_in
  else:
    logging.error(f"unable to child places from {req_url}")
  return []


def get_type_and_all_parent_places(place_dcids: List[str]) -> Dict:
  """Get a mapping of place to parent places, and its own place type"""
  req_url = f"https://api.datacommons.org/v1/bulk/info/place?key={_API_KEY}&nodes="
  req_url += "&nodes=".join(place_dcids)
  response = requests.get(req_url)
  if response.status_code == 200:
    # Format response into a mapping of place -> place type, list of parent dcids
    child_place_list = response.json().get("data", [])
    mapping = {}
    for place in child_place_list:
      place_dcid = place.get("node", "")
      place_type = place.get("self", {}).get("type", None)     
      mapping[place_dcid] = {"type": place_type, "parents": []}
      parents = place.get("info", {}).get("parents", [])
      for parent_place in parents:
        if parent_place.get("type", "") in _PLACE_HIERARCHY:
          mapping[place_dcid]["parents"].append(parent_place.get("name"))
    return mapping
  else:
    logging.error(f"unable to fetch parent places from {req_url}")
  return {}

def get_sv_values(sv_dcid: str, place_dcids: List[str]) -> Dict:
  """Get mapping of place_dcid -> value"""
  # req_url = f"https://api.datacommons.org/v1/bulk/info/place?key={_API_KEY}&nodes="
  # req_url += "&nodes=".join(place_dcids)
  # response = requests.get(req_url)
  # if response.status_code == 200:
  #   # Format response into a mapping of place -> place type, list of parent dcids
  #   child_place_list = response.json().get("data", [])
  #   mapping = {}
  #   for place in child_place_list:
  #     place_dcid = place.get("node", "")
  #     place_type = place.get("self", {}).get("type", None)     
  #     mapping[place_dcid] = {"type": place_type, "parents": []}
  #     parents = place.get("info", {}).get("parents", [])
  #     for parent_place in parents:
  #       if parent_place.get("type", "") in _PLACE_HIERARCHY:
  #         mapping[place_dcid]["parents"].append(parent_place.get("name"))
  #   return mapping
  # else:
  #   logging.error(f"unable to fetch parent places from {req_url}")
  return {}

# TODO: assert place type passed in does match DCID provided
def initialize_summaries(place_dcids: List[str], names: Dict, place_type: str,
                         parent_place_name: str) -> Dict:
  """Initialize mapping of place dcid -> summary with starter sentence."""
  summaries = {}
  for place_dcid in place_dcids:
    place_name = names[place_dcid]
    if place_type.lower() == "state" and place_dcid == "geoId/11":
      # Special handling for Washington DC
      # which is a federal district, not a state
      sentence = _TEMPLATE_STARTING_SENTENCE.format(
          place_name=place_name,
          place_type="federal district",
          parent_place_name=parent_place_name)
    else:
      sentence = _TEMPLATE_STARTING_SENTENCE.format(
          place_name=place_name,
          place_type=place_type.lower(),
          parent_place_name=parent_place_name)
    summaries[place_dcid] = [sentence]
  return summaries


def format_stat_var_value(value: float, stat_var_data: Dict) -> str:
  """Format a stat var observation to print nicely in a sentence"""
  scaling = stat_var_data['scaling']
  if not scaling:
    scaling = 1
  # Round to 2nd decimal place
  rounded_value = round(value, 2) * scaling
  unit = stat_var_data['unit']
  if unit == "$":
    return "{unit}{value:,}".format(unit=unit, value=rounded_value)
  return "{value:,}{unit}".format(unit=unit, value=rounded_value)


def build_ranking_based_summaries(place_type: str, parent_place_dcid: str):
  """Get a summary for all child places of a parent place, based on rankings.
  
  Builds a summary using templated sentences. A place's observations for a
  variable for that place is highlighted if they rank highly for that place.
  """
  child_places = get_all_places_in(place_type, parent_place_dcid)
  name_of = get_names(child_places + [parent_place_dcid])
  parent_place_name = name_of[parent_place_dcid]
  if parent_place_dcid == "country/USA":
    # USA needs "the" in front in sentences.
    parent_place_name = "the United States of America"
  #population_of = get_population(child_places)
  sentences = initialize_summaries(child_places, name_of, place_type,
                                   parent_place_name)

  # Process each variable
  with open(_STAT_VAR_JSON) as sv_f:
    sv_data = json.load(sv_f)

    for category, sv_list in sv_data.items():

      if category in _CATEGORY_SKIP_LIST:
        continue

      for sv in sv_list:
        # Get ranking for variable
        rank_list = get_ranking(stat_var_dcid=sv["sv"],
                                  place_type=place_type,
                                  parent_place_dcid=parent_place_dcid)

        # Add summaries for top places
        for i in range(len(rank_list)):
          rank_item = rank_list[i]
          place_dcid = rank_item['placeDcid']
          sv_value = format_stat_var_value(value=rank_item['value'],
                                           stat_var_data=sv)
          sentence = None

          if i < _DEFAULT_RANKING_THRESHOLD:
            sentence = _TEMPLATE_RANKING_SENTENCE.format(
                place_name=name_of[place_dcid],
                rank=get_rank_string(rank_item['rank']),
                parent_place_name=parent_place_name,
                stat_var_name=sv['name'],
                value=sv_value,
            )

          elif i <= len(rank_list) * _DEFAULT_PERCENTAGE_THRESHOLD:
            sentence = _TEMPLATE_VALUE_SENTENCE.format(
                stat_var_name=sv['name'],
                place_name=name_of[place_dcid],
                value=sv_value,
                date_str="")

          if sentence:
            sentences[place_dcid].append(sentence)

  # Combine sentences into a paragraph:
  summaries = {}
  for place, sentence_list in sentences.items():
    summaries[place] = {"summary": " ".join(sentence_list)}

  # Write summaries to file
  with open(_OUTPUT_FILENAME, "w") as out_file:
    json.dump(summaries, out_file, indent=4)


# def build_template_summaries(place_list):
#   name_of = get_names(place_list)
#   place_info = get_type_and_all_parent_places(place_list)

#   sentences = {}
#   for place_dcid, info in place_info.items():
#     place_name = name_of[place_dcid]
#     place_type = info["type"].lower()
#     sentence = f"{place_name} is a {place_type} in "
#     parent_names = []
#     for parent in info["parents"]:
#       if place_type == "Country":
#         raise NotImplementedError
#       else:
#         if parent["type"] in ["City", "County", "State", "Country"]:
#           parent_names.append(parent["name"])
#     sentence += ", ".join(parent_names)
#     sentences[place_dcid] = [sentence]

#   # Process each variable
#   with open(_STAT_VAR_JSON) as sv_f:
#     sv_data = json.load(sv_f)

#     for category, sv_list in sv_data.items():

#       if category in _CATEGORY_SKIP_LIST:
#         continue

#       for sv in sv_list:
#         # Get ranking for variable
#         rank_list = get_ranking(stat_var_dcid=sv["sv"],
#                                   place_type=place_type,
#                                   parent_place_dcid=parent_place_dcid)

#         # Add summaries for top places
#         for i in range(len(rank_list)):
#           rank_item = rank_list[i]
#           place_dcid = rank_item['placeDcid']
#           sv_value = format_stat_var_value(value=rank_item['value'],
#                                            stat_var_data=sv)
#           sentence = None

#           if i < _DEFAULT_RANKING_THRESHOLD:
#             sentence = _TEMPLATE_RANKING_SENTENCE.format(
#                 place_name=name_of[place_dcid],
#                 rank=get_rank_string(rank_item['rank']),
#                 parent_place_name=parent_place_name,
#                 stat_var_name=sv['name'],
#                 value=sv_value,
#             )

#           else:
#             sentence = _TEMPLATE_VALUE_SENTENCE.format(
#                 stat_var_name=sv['name'],
#                 place_name=name_of[place_dcid],
#                 value=sv_value,
#                 date_str="")

#           if sentence:
#             sentences[place_dcid].append(sentence)

#   # Combine sentences into a paragraph:
#   summaries = {}
#   for place, sentence_list in sentences.items():
#     summaries[place] = " ".join(sentence_list)

#   # Write summaries to file
#   with open(_OUTPUT_FILENAME, "w") as out_file:
#     json.dump(summaries, out_file, indent=4)

def main():
  build_ranking_based_summaries(place_type="State",
                                parent_place_dcid="country/USA")

if __name__ == "__main__":
  main()
