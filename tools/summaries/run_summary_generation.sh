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

if [ -z "$MIXER_API_KEY" ]
then
  echo "ERROR: Environment variable MIXER_API_KEY is not set."
else
  python3 -m venv .env
  source .env/bin/activate
  python3 -m pip install -r requirements.txt

  # Get US States + Top 100 Cities summaries from saved Bard output
  python3 build_summaries_from_csv.py priority-places-bard.tsv \
    --output_path generated_summaries/us_states_and_100_cities.json \
    --place_column_name DCID \
    --summary_column_name Strict \

  # Generate country summaries
  python3 build_template_summaries.py https://datacommons.org/sitemap/Country.0.txt \
    --output_file generated_summaries/countries.json

  # Generate US county summaries
  python3 build_template_summaries.py https://datacommons.org/sitemap/Counties.0.txt \
    --output_file generated_summaries/us_counties.json

  # Combine into one output
  python3 build_summaries.py
fi

