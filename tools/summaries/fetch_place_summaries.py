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
from datetime import timedelta
import json
import logging
import os
import time
from typing import Dict, List

import click

from tools.summaries import dc
from tools.summaries import utils

# Where to write output json summaries to
_OUTPUT_FILE = "place_summaries_from_template.json"

# Where to read stat var specs from
_STAT_VAR_JSON = "stat_vars_to_highlight.json"

# Template for the first sentence in the summary
_TEMPLATE_STARTING_SENTENCE = "{place_name} is a {place_type} in {parent_places}."

# Template for sharing the value of a stat var
_TEMPLATE_VALUE_SENTENCE = "The {stat_var_name} in {place_name} was {value} in {year}."

# Where to write intermediate results to
_TEMP_FILENAME = 'generated_summaries/temp_output_batch_{num}.json'

# Number of places to process at once
_BATCH_SIZE = 500


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
  """Generate summaries using template sentences for a list of stat vars
  
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
      logging.info(f"Generating summary for {place_name} ({place_dcid})")

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

  # Create summary dict
  summaries = {
      place_dcid: {
          "summary": " ".join(sentence_list)
      } for place_dcid, sentence_list in sentences.items()
  }

  return summaries


def build_template_summaries_for_sitemap(sitemap: str,
                                         stat_var_json: str = _STAT_VAR_JSON,
                                         batch_size: int = _BATCH_SIZE,
                                         output_file: str = _OUTPUT_FILE,
                                         start_index: int = None) -> Dict:
  """Generate summaries for all places in a sitemap"""
  start_time = time.time()

  # Extract places to create summaries for from sitemap
  places = utils.get_places_from_sitemap(sitemap)
  if start_index:
    # Skip first lines of sitemap to start processing at start_index instead
    places = places[start_index:]
  total_num_places = len(places)
  logging.info(f'Generating summaries for {total_num_places} places')

  # Get summaries in batched calls
  batch_num = 0
  batch_start_time = time.time()
  batches = utils.batched(places, batch_size)
  total_num_batches = len(batches)
  for batch in batches:
    logging.info(
        f'Processing batch number {batch_num + 1} out of {total_num_batches}')
    summaries = build_template_summaries(place_dcids=batch,
                                         stat_var_json=stat_var_json)
    # Write intermediate results to a temporary file
    # This allows us to save partial progress incase we hit server errors
    temp_path = _TEMP_FILENAME.format(num=batch_num)
    utils.write_summaries_to_file(summaries=summaries, output_file=temp_path)
    logging.info(f'Wrote intermediate results to {temp_path}')
    logging.info(
        f'Took {timedelta(seconds=time.time()-batch_start_time)} to write batch'
    )
    batch_num += 1
    batch_start_time = time.time()

  # Combine intermediate results into one
  logging.info('Combining batched summaries')
  all_data = []
  for i in range(batch_num):
    filename = _TEMP_FILENAME.format(num=i)
    with open(filename) as f:
      all_data.append(json.load(f))

  # Write summary
  summaries = utils.combine_summaries(all_data)
  utils.write_summaries_to_file(summaries, output_file)
  logging.info(f'Wrote {total_num_places} summaries to {output_file}')

  # Cleanup temp files
  for i in range(batch_num):
    filename = _TEMP_FILENAME.format(num=i)
    os.remove(filename)

  logging.info('Done!')
  logging.info(
      f'Total elapsed time: {timedelta(seconds=time.time()-start_time)}')


@click.command()
@click.argument('sitemap')
@click.option('--stat_var_json',
              default=_STAT_VAR_JSON,
              help='path to stat var config')
@click.option('--output_file',
              default=_OUTPUT_FILE,
              help='output file to write summaries to')
@click.option('--batch_size',
              default=_BATCH_SIZE,
              help='how many places to process at once')
@click.option('--start_index',
              default=None,
              help='''Which line of the sitemap to start from. Useful
                   for skipping sitemap entries that already have summaries.''',
              type=int)
def main(sitemap: str, stat_var_json: str, output_file: str, batch_size: int,
         start_index: int):
  logging.getLogger().setLevel(logging.INFO)
  build_template_summaries_for_sitemap(sitemap,
                                       stat_var_json=stat_var_json,
                                       output_file=output_file,
                                       batch_size=batch_size,
                                       start_index=start_index)


if __name__ == "__main__":
  main()
