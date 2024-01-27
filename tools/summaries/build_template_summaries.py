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
"""Generate summaries using template sentences about a set list of variables."""

import json
import sys
import logging
from typing import Dict, List

from absl.flags import FLAGS
import dc

# Load flags
FLAGS(sys.argv)

# Where to write output json summaries to
_OUTPUT_FILENAME = "place_summaries_from_template.json"

# Where to read places to generate summaries for
_PLACES_JSON = "priority-places.json"

# Where to read stat var specs from
_STAT_VAR_JSON = "stat_vars_to_highlight.json"

# Template for the first sentence in the summary
_TEMPLATE_STARTING_SENTENCE = "{place_name} is a {place_type} in {parent_places}."

# Template for sharing the value of a stat var
_TEMPLATE_VALUE_SENTENCE = "The {stat_var_name} in {place_name} was {value} in {year}."


def initialize_summaries(place_info: Dict) -> Dict:
  """Initialize mapping of place dcid -> summary with starter sentence."""
  sentences = {}
  for node in place_info:
    # get info about the place itself
    node_info = node.get("info", {}).get("self")
    place_dcid = node_info.get("dcid")
    place_name = node_info.get("name")
    place_type = node_info.get("type")

    # get list of parent places
    parents = []
    for parent in node.get("info", {}).get("parents", []):
      if 'name' not in parent or 'type' not in parent:
        continue

      if place_type == "Country":
        # For Country summaries, only use Continent as parent place
        if parent['type'] == "Continent":
          parents.append(parent['name'])

      elif parent['type'] in ["County", "State", "Country"]:
        parents.append(parent['name'])

    # format parent places for display
    parent_str = ", ".join(parents)
    if parents == ["country/USA"]:
      # when USA is the only place, needs to have "the" in front
      parent_str = "the United States"

    # add starting sentence
    sentence = _TEMPLATE_STARTING_SENTENCE.format(
        place_name=place_name,
        place_type=place_type.lower() if place_type else '',
        parent_places=parent_str)
    sentences[place_dcid] = [sentence]
  return sentences



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


def build_template_summaries(place_dcids: List[str],
                             stat_var_json=str,
                             output_file=str):
  logging.info("Starting summary generation...")

  # fetch info about the places to build summaries for
  place_info = dc.get_place_info(place_dcids).get("data", {})

  # build dcid -> name mapping
  names = {node.get("node"): node.get("info", {}).get("self", {}).get("name") for node in place_info}

  # Generate the first starter sentence for each place
  sentences = initialize_summaries(place_info)

  # Get stat vars to use and their metadata from config
  with open(stat_var_json) as sv_f:
    sv_config = json.load(sv_f)
    sv_list = sv_config.keys()

  # Create sentences for each stat var, for each place
  for place_dcid in place_dcids:
    logging.info(f"Generating summaries for {names[place_dcid]} ({place_dcid})...")

    # Get stat var values for all stat vars to use
    data_series = dc.get_data_series(place_dcid, sv_list)

    # Write a sentence for each stat var
    for sv, sv_data in data_series.items():
      series = sv_data.get("val", {})
      sorted_dates = sorted(list(series.keys()), reverse=True)
      latest_date = sorted_dates[0] if sorted_dates else ""
      value = series[latest_date]
                          
      sentence = _TEMPLATE_VALUE_SENTENCE.format(
        stat_var_name=sv_config.get(sv, {}).get("name"),
        place_name=names[place_dcid],
        value=format_stat_var_value(value, sv_config.get(sv,{})),
        year=latest_date[:4]
      )

      sentences[place_dcid].append(sentence)

  # Create summary dict to write to file
  summaries = {
      place_dcid: { "summary": " ".join(sentence_list) }
      for place_dcid, sentence_list in sentences.items()
  }
  
  # Write to output file
  with open(output_file, "w") as out_f:
    json.dump(summaries, out_f, indent=4)

  logging.info(f"Wrote summaries to {output_file}!")

def main():
  with open(_PLACES_JSON) as f:
    places = json.load(f)
  
  build_template_summaries(place_dcids=places,
                           stat_var_json=_STAT_VAR_JSON,
                           output_file=_OUTPUT_FILENAME)


if __name__ == "__main__":
  main()
