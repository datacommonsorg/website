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
"""Utility functions for summary generation"""

import json
import logging
from typing import Dict, List

import requests

# Base URL for place pages listed in sitemaps
_PLACE_PAGE_BASE_URL = "https://datacommons.org/place/"


def format_stat_var_value(value: float, stat_var_data: Dict) -> str:
  """Format a stat var observation to print nicely in a sentence
  
  Args:
    value: numeric value to format
    stat_var_data: dict of metadata for the stat var measured. May contain
                   entries for 'scaling', a numeric scaling factor, and 'unit',
                   the unit to display along side the value.
  
  Returns:
    The value formatted by: scaling, rounded to 2 decimal places, and adding the
    unit
  """
  scaling = stat_var_data.get('scaling')
  if not scaling:
    scaling = 1
  # Round to 2nd decimal place
  rounded_value = round(value, 2) * scaling
  unit = stat_var_data.get('unit', '')
  if unit == "$":
    return "{unit}{value:,}".format(unit=unit, value=rounded_value)
  return "{value:,}{unit}".format(unit=unit, value=rounded_value)


def combine_summaries(summaries: List[Dict]) -> Dict:
  """Combine multiple summary dictionaries into one dictionary"""
  combined = {}
  for summary_dict in summaries:
    combined |= summary_dict
  return combined


def write_summaries_to_file(summaries: Dict, output_file: str):
  """Write summary dict json"""
  # Write to output file
  with open(output_file, "w") as out_f:
    json.dump(summaries, out_f, indent=4)
  logging.info(f"Wrote summaries to {output_file}!")


def load_summaries(input_file: str) -> Dict:
  """Read a summary json into a dict"""
  with open(input_file) as f:
    return json.load(f)


def parse_place_types(place_info_response) -> Dict:
  """Get mapping of place_dcids -> place type from v1 place info API response"""
  mapping = {}
  for place in place_info_response.get("data", []):
    place_info = place.get("info", {}).get("self", {})
    place_dcid = place_info.get("dcid")
    place_type = place_info.get("type")
    if place_dcid and place_type:
      mapping[place_dcid] = place_type
  return mapping


def parse_place_parents(place_info_response) -> Dict:
  """Get mapping of place_dcids -> parents from v1 place info API response"""
  mapping = {}
  for place in place_info_response.get("data", []):
    place_dcid = place.get("node")
    parents = place.get("info", {}).get("parents", [])
    if place_dcid and parents:
      mapping[place_dcid] = parents
  return mapping


def get_places_from_sitemap(sitemap_url: str) -> List[str]:
  """Get list of places from a sitemap"""
  response = requests.get(sitemap_url)
  if response.status_code == 200:
    sitemap = response.text
    lines = sitemap.split('\n')
    places = []
    for line in lines:
      if line.startswith(_PLACE_PAGE_BASE_URL):
        places.append(line[len(_PLACE_PAGE_BASE_URL):])
    return places
  else:
    logging.error(f"Error fetching sitemap {sitemap_url}.")
  return []


def batched(lst: List, batch_size: int) -> List[List]:
  '''Get list elements batched into lists of a set batch size'''
  return [lst[i:i + batch_size] for i in range(0, len(lst), batch_size)]