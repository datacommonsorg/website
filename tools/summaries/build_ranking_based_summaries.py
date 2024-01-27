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
"""Generate ranking-based summaries for all child places of a specific place
type in a parent place.

Will generate summaries like:
  <place name> is a <place type> in <parent place>. <place_name> ranks <rank>
  in <parent place> by <stat var name> (<value>).

Will only add a sentence about a variable to the summary if the place ranks
highly by that variable.
"""

import json
from typing import Dict, List

import dc

# Where to write output json summaries to
_OUTPUT_FILENAME = "place_summary_content_us_states.json"

# Where to read stat var specs from
_STAT_VAR_JSON = "stat_vars_detailed.json"

# Rank (top-X) needed to have a statistic highlighted.
_DEFAULT_RANKING_THRESHOLD = 3

# Percentage needed (in top X%) needed to have a statistic highlighted.
# Number from 0 to 1.
_DEFAULT_PERCENTAGE_THRESHOLD = 0.10

# Categories of variables to skip
_CATEGORY_SKIP_LIST = [
    "Ignored",  # Presents bad image in summaries
    "Crime",  # Presents bad image in summaries
    "Education",  # Vars not interesting
]

# Template for the first sentence in the summary
_TEMPLATE_STARTING_SENTENCE = "{place_name} is a {place_type} in {parent_place_name}."

# Template for stat var a place ranks highly in
_TEMPLATE_RANKING_SENTENCE = "{place_name} ranks {rank} in {parent_place_name} by {stat_var_name} ({value})."

# Template for sharing the value of a stat var
_TEMPLATE_VALUE_SENTENCE = "The {stat_var_name} in {place_name} is {value}."

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


def build_ranking_based_summaries(place_type: str, parent_place_dcid: str,
                                  stat_var_json: str, output_file: str):
  """Get a summary for all child places of a parent place, based on rankings.
  
  Builds a summary using templated sentences. A place's observations for a
  variable for that place is highlighted if they rank highly for that place.

  Args:
    place_type: the place type of the child places to write summaries about
    parent_place_dcid: dcid of the parent place
    stat_var_json: path to a stat var config file, listing stat vars to use
    output_file: path to write output to
  """
  child_places = dc.get_child_places(place_type, parent_place_dcid)
  name_of = dc.get_names(child_places + [parent_place_dcid])
  parent_place_name = name_of[parent_place_dcid]
  if parent_place_dcid == "country/USA":
    # USA needs "the" in front in sentences.
    parent_place_name = "the United States of America"
  #population_of = get_population(child_places)
  sentences = initialize_summaries(child_places, name_of, place_type,
                                   parent_place_name)

  # Process each variable
  with open(stat_var_json) as sv_f:
    sv_data = json.load(sv_f)

    for category, sv_list in sv_data.items():

      if category in _CATEGORY_SKIP_LIST:
        continue

      for sv in sv_list:
        # Get ranking for variable
        rank_list = dc.get_ranking_by_var(stat_var_dcid=sv["sv"],
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


def main():
  build_ranking_based_summaries(place_type="State",
                                parent_place_dcid="country/USA",
                                stat_var_json=_STAT_VAR_JSON,
                                output_file=_OUTPUT_FILENAME)


if __name__ == "__main__":
  main()
