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
import os
from typing import Dict, List

# Base URL for place pages listed in sitemaps
_PLACE_PAGE_BASE_URL = "https://datacommons.org/place/"

# Where to write summary jsons to
_SUMMARY_OUTPUT_LOCATION = '../../server/config/summaries/'

# Regex Prefixes to use as the groupings for sharding
SHARD_DCID_PREFIXES = [
  "geoId/[0-2]",
  "geoId/[3-5]",
  "geoId/[6-9]",
  "country/",
  "wikidataId/",
]

# Filename format of sharded json file containing place summaries
SHARD_FILENAME = "place_summaries_for_{shard}.json"

# Filename for summary json for DCIDs that don't match any other shard
DEFAULT_FILENAME = "place_summaries_others.json"

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
  logging.info(f"Wrote summaries to {output_file}.")


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


def get_places_from_sitemap(sitemap: str) -> List[str]:
  """Get list of places from a sitemap"""
  places = []
  with open(sitemap) as f:
    lines = f.read().splitlines()
    for line in lines:
      if line.startswith(_PLACE_PAGE_BASE_URL):
        places.append(line[len(_PLACE_PAGE_BASE_URL):])
  return places


def batched(lst: List, batch_size: int) -> List[List]:
  """Get list elements batched into lists of a set batch size"""
  return [lst[i:i + batch_size] for i in range(0, len(lst), batch_size)]



def get_shard_prefix(dcid: str) -> str:
  """Return shard prefix the given DCID matches to, or '' if no match"""
  for prefix in SHARD_DCID_PREFIXES:
    if dcid.startswith(prefix):
      return prefix
  return ''


def get_shard_filename_by_prefix(prefix: str) -> str:
  """Get the filename for a place summary json given a DCID prefix"""
  if prefix in SHARD_DCID_PREFIXES:
    return SHARD_FILENAME.format(shard=prefix.replace('/', '_').replace('[', '').replace(']', ''))
  else:
    return DEFAULT_FILENAME


def get_shard_filename_by_dcid(dcid: str) -> str:
  """Get the filename of the shard containing the summary for a given DCID"""
  prefix = get_shard_prefix(dcid)
  if prefix:
    return get_shard_filename_by_prefix(prefix)
  return DEFAULT_FILENAME

def shard_summaries(summaries: Dict) -> Dict[str, Dict]:
  """Split a single summary dict into multiple based on DCID prefixes"""
  shards = {prefix: {} for prefix in SHARD_DCID_PREFIXES}
  shards['no-match'] = {}

  for dcid, entry in summaries.items():
    dcid_prefix = get_shard_prefix(dcid)
    if dcid_prefix:
      shards[dcid_prefix][dcid] = entry
    else:
      shards['no-match'][dcid] = entry

  return shards


def write_shards_to_files(shards: Dict[str, Dict]) -> None:
  """Write sharded summaries to their respective jsons"""
  # Write a file for each of the prefixes in SHARD_DCID_PREFIXES
  for prefix in SHARD_DCID_PREFIXES:
    summaries = {}
    if prefix in shards:
      summaries = shards[prefix]
    filepath = os.path.join(
        _SUMMARY_OUTPUT_LOCATION,
        get_shard_filename_by_prefix(prefix))
    write_summaries_to_file(summaries, filepath)

  # Write a file for DCIDs that don't match any of the prefixes
  if 'no-match' in shards:
    filepath = os.path.join(_SUMMARY_OUTPUT_LOCATION,
                            DEFAULT_FILENAME)
    write_summaries_to_file(shards['no-match'], filepath)
