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
"""Generate summaries using template sentences about a set list of variables.

To use:

  From the tools/summaries directory:
    $ export MIXER_API_KEY=<your api key>
    $ python3 -m venv .env
    $ source .env/bin/activate
    $ python3 build_template_summaries.py

"""

import json
import logging
import sys
from typing import Dict, List

from absl.flags import FLAGS
import dc
import utils

# Load flags
FLAGS(sys.argv)

# Where to write output json summaries to
_OUTPUT_FILENAME = "place_summaries_from_template.json"

# Where to read stat var specs from
_STAT_VAR_JSON = "stat_vars_to_highlight.json"

# Template for the first sentence in the summary
_TEMPLATE_STARTING_SENTENCE = "{place_name} is a {place_type} in {parent_places}."

# Template for sharing the value of a stat var
_TEMPLATE_VALUE_SENTENCE = "The {stat_var_name} in {place_name} was {value} in {year}."


def initialize_summaries(
    place_dcids: List[str], names: Dict[str, str], types: Dict[str, str],
    parents_with_type: List[Dict[str, str]]) -> Dict[str, List[str]]:
  """Initialize mapping of place dcid -> summary with a starter sentence
  
  Args:
    place_dcids: list of dcids of places to write sentences for
    names: mapping of place dcid -> name of place
    types: mapping of place dcid -> place type
    parents_with_type: mapping of place dcid -> list of dicts describing parent
                       places with keys "type" and "name"
  
  Returns:
    A dict of place dcid -> list with starter sentence as only entry
  """
  sentences = {}
  for place_dcid in place_dcids:
    place_name = names.get(place_dcid)
    place_type = types.get(place_dcid)
    parents = parents_with_type.get(place_dcid, [])

    # filter parent places to add to sentences
    parents_to_display = []
    for parent in parents:
      if 'name' not in parent or 'type' not in parent:
        continue

      if place_type == "Country":
        # For Country summaries, only use Continent as parent place
        if parent['type'] == "Continent":
          parents_to_display.append(parent['name'])

      elif parent['type'] in ["State", "Country"]:
        parents_to_display.append(parent['name'])

    if place_name and place_type and parents_to_display:
      # format parent places for display
      parent_str = ", ".join(parents_to_display)
      if parents_to_display == ["country/USA"]:
        # when USA is the only place, needs to have "the" in front
        parent_str = "the United States"

      # add starting sentence
      sentence = _TEMPLATE_STARTING_SENTENCE.format(
          place_name=place_name,
          place_type=place_type.lower() if place_type else '',
          parent_places=parent_str)
      sentences[place_dcid] = [sentence]
  return sentences


def build_template_summaries(place_dcids: List[str], stat_var_json=str) -> Dict:
  """Write template-based summaries to file
  
  Args:
    place_dcids: list of dcids of places to generate summaries for
    stat_var_json: path to a stat var config. Config should map
                   stat_var_dcid -> {dcid, name, unit, scaling}
  """
  logging.info("Starting summary generation...")

  # fetch info about the places to build summaries for
  place_info = dc.get_place_info(place_dcids)
  place_types = utils.parse_place_types(place_info)
  parent_places = utils.parse_place_parents(place_info)

  # place info endpoint misses some place names
  # use property value endpoint instead
  place_names = dc.get_property(property="name", place_dcids=place_dcids)

  # Generate the first starter sentence for each place
  sentences = initialize_summaries(place_dcids, place_names, place_types,
                                   parent_places)

  # Get stat vars to use and their metadata from config
  with open(stat_var_json) as sv_f:
    sv_config = json.load(sv_f)
    sv_list = sv_config.keys()

  # Create sentences for each stat var, for each place
  for place_dcid in place_dcids:
    place_name = place_names.get(place_dcid)

    if place_name:
      logging.info(f"Generating summaries for {place_name} ({place_dcid})...")

      # Get stat var values for all stat vars to use
      data_series = dc.get_data_series(place_dcid, sv_list)

      # Write a sentence for each stat var
      for sv, sv_data in data_series.items():
        series = sv_data.get("val", {})
        sorted_dates = sorted(list(series.keys()), reverse=True)
        latest_date = sorted_dates[0] if sorted_dates else ""
        value = series.get(latest_date)

        sentence = _TEMPLATE_VALUE_SENTENCE.format(
            stat_var_name=sv_config.get(sv, {}).get("name"),
            place_name=place_name,
            value=utils.format_stat_var_value(value, sv_config.get(sv, {})),
            year=latest_date[:4])

        if place_dcid not in sentences:
          sentences[place_dcid] = [sentence]
        else:
          sentences[place_dcid].append(sentence)

  # Create summary dict to write to file
  summaries = {
      place_dcid: {
          "summary": " ".join(sentence_list)
      } for place_dcid, sentence_list in sentences.items()
  }

  return summaries


def main():
  with open("priority-places.json") as f:
    priority_places = json.load(f)

  with open("places-countries.json") as f:
    countries = json.load(f)

  priority_summaries = build_template_summaries(place_dcids=priority_places,
                                                stat_var_json=_STAT_VAR_JSON)

  country_summaries = build_template_summaries(place_dcids=countries,
                                               stat_var_json=_STAT_VAR_JSON)

  all_summaries = utils.combine_summaries(
      [priority_summaries, country_summaries])

  utils.write_summaries_to_file(summaries=all_summaries,
                                output_file=_OUTPUT_FILENAME)


if __name__ == "__main__":
  logging.getLogger().setLevel(logging.INFO)
  main()
