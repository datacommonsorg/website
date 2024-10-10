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

# UN SDG Home like: "http://45.79.10.25/UNSDWebsite/undatacommons"
sdg_home=$1

if [[ $sdg_home = "" ]]; then
  sdg_home=http://45.79.10.25/UNSDWebsite/undatacommons
fi

echo "UN SDG Home: $sdg_home"

NO_PIP=$2

export FLASK_ENV=webdriver
export GOOGLE_CLOUD_PROJECT=datcom-website-dev

python3 -m venv .env
source .env/bin/activate
if [[ $NO_PIP != "true" ]]; then
  python3 -m pip install --upgrade pip setuptools
  pip3 install -r server/requirements.txt
fi

date_str=$(TZ="America/Los_Angeles" date +"%Y_%m_%d_%H_%M_%S")
cd server/webdriver/tests/standalone
python3 sdg_sanity.py --base_url="$sdg_home"
gsutil cp ./output/*.csv gs://un-sdg-sanity/$date_str/
rm ./output/*.csv
