#!/bin/bash
# Copyright 2023 Google LLC
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

set -e

export FLASK_ENV=webdriver
export GOOGLE_CLOUD_PROJECT=datcom-website-dev
export ENABLE_MODEL=true

python3 -m venv .env
source .env/bin/activate
pip3 install -r server/requirements.txt
python3 -m pip install --upgrade pip setuptools light-the-torch
ltt install torch --cpuonly
pip3 install -r nl_server/requirements.txt

# Define a list of domains
domain_list="datacommons.feedingamerica.org"

# Loop through the domain list
for domain in $domain_list
do
  date_str=$(date +"%Y_%m_%d_%H_%M_%S")
  python3 -m server.webdriver.screenshot.remote.main -d $domain
  gsutil cp ./screenshots/*.png ./screenshots/.png gs://datcom-website-screenshot/$domain/$date_str/
done
