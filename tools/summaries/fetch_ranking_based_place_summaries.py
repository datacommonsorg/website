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

This was the script used to generate the summaries used in mid-January 2024,
which are no longer used. This script is no longer used and has been depreciated
in favor of fetch_place_summaries.py.

Will generate summaries like:
  <place name> is a <place type> in <parent place>. <place_name> ranks <rank>
  in <parent place> by <stat var name> (<value>).

Will only add a sentence about a variable to the summary if the place ranks
highly by that variable.
"""

import json
from typing import Dict, List

import click
import dc
import utils

# Where to write output json summaries to
_OUTPUT_FILE = "ranking_based_summaries.json"

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
  """Initialize mapping of place dcid -> summary with starter sentence.
  
  Args:
    place_dcids: list of dcids of places to generate summaries for. Must all
                 be the same place type
    names: mapping of place_dcid -> place_name
    place_type: the type of place in place_dcids.
    parent_place_name: the name of the common parent place to all places
                       in place_dcids.
  
  Returns:
    Mapping of place_dcid -> ["starter sentence"]
  """
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
  name_of = dc.get_property("name", child_places + [parent_place_dcid])
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
          sv_value = utils.format_stat_var_value(value=rank_item['value'],
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
  with open(output_file, "w+") as out_file:
    json.dump(summaries, out_file, indent=4)


@click.command()
@click.argument('place_type')
@click.argument('parent_place_dcid')
@click.option(
    '--stat_var_json',
    default=_STAT_VAR_JSON,
    help=
    '''path to stat var json with dictionary entries for the dcid, name, unit, 
    and scaling of stat vars to include in summaries. See 
    stat_vars_detailed.json for an example.''')
@click.option('--output_file',
              default=_OUTPUT_FILE,
              help="path to write summaries to")
def main(place_type: str, parent_place_dcid: str, stat_var_json: str,
         output_file: str):
  build_ranking_based_summaries(place_type=place_type,
                                parent_place_dcid=parent_place_dcid,
                                stat_var_json=stat_var_json,
                                output_file=output_file)


if __name__ == "__main__":
  main()
