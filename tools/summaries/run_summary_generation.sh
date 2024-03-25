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
#!/bin/bash

set -e

if [ -z "$MIXER_API_KEY" ]
then
  echo "ERROR: Environment variable MIXER_API_KEY is not set."
else
  # Relative paths from repo root directory
  DIR="tools/summaries"
  MODULE="tools.summaries"

  # Execute from repo root directory
  cd ../..
  python3 -m venv .env
  source .env/bin/activate
  python3 -m pip install -r $DIR/requirements.txt

  # Get US States + Top 100 Cities summaries from saved Bard output
  echo "Getting US States and Top 100 US cities summaries from saved Bard output"
  python3 -m $MODULE.tsv_place_summaries_to_json $DIR/priority-places-bard.tsv \
    --output_path $DIR/generated_summaries/us_states_and_100_cities.json \
    --place_column_name DCID \
    --summary_column_name Strict

  # Generate country summaries
  echo "Generating country summaries"
  python3 -m $MODULE.fetch_place_summaries static/sitemap/Country.0.txt \
    --output_file $DIR/generated_summaries/countries.json \
    --stat_var_json $DIR/stat_vars_to_highlight.json

  # Generate US county summaries
  echo "Generating US county summaries"
  python3 -m $MODULE.fetch_place_summaries static/sitemap/County.0.txt \
    --output_file $DIR/generated_summaries/us_counties.json \
    --stat_var_json $DIR/stat_vars_to_highlight.json

  # Generate global cities summaries
  # Skip first 151 places in PriorityPlaces.0.txt
  # Those places already have summaries in us_states_and_100_cities.json
  echo "Generating global cities summaries"
  python3 -m $MODULE.fetch_place_summaries static/sitemap/PriorityPlaces.0.txt \
    --output_file $DIR/generated_summaries/global_cities.json \
    --stat_var_json $DIR/stat_vars_to_highlight.json \
    --start_index 151

  # Write all generated summaries to sharded json files.
  echo "Combining summaries and writing to config"
  python3 -m $MODULE.generate_place_summary_shards \
    $DIR/generated_summaries/countries.json \
    $DIR/generated_summaries/us_counties.json \
    $DIR/generated_summaries/global_cities.json \
    $DIR/generated_summaries/us_states_and_100_cities.json
fi


