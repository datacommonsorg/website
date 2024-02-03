# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
'''Main script for generating place page summaries'''

import json
import logging

import click
import utils

_FILES_TO_INCLUDE = [
  'us_states_and_100_cities.json',
  'us_counties.json',
  'countries.json'
]

_OUTPUT_LOCATION = '../../server/config/summaries/place_summaries.json'

@click.command()
def main():
  # Load all summaries
  summaries = []
  for file in _FILES_TO_INCLUDE:
    with open(f'generated_summaries/{file}') as f:
      summaries.append(json.load(f))

  # Combine into one json
  output_summaries = utils.combine_summaries(summaries)

  # Write to file
  utils.write_summaries_to_file(output_summaries, _OUTPUT_LOCATION)

if __name__ == '__main__':
  logging.getLogger().setLevel(logging.INFO)
  main()
