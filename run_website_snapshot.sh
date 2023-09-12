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

# DC Instance domain like: "dev.datacommons.org", "datacommons.org"
domain=$1
echo "Domain: $domain"

NO_PIP=$2

export FLASK_ENV=webdriver

python3 -m venv .env
source .env/bin/activate
if [[ $NO_PIP != "true" ]]; then
  python3 -m pip install --upgrade pip setuptools
  pip3 install -r server/requirements.txt
fi

date_str=$(TZ="America/Los_Angeles" date +"%Y_%m_%d_%H_%M_%S")
python3 -m server.webdriver.screenshot.remote.main -d $domain
gsutil -o "GSUtil:parallel_process_count=1" -m cp ./screenshots/*.png ./screenshots/*.json gs://datcom-website-screenshot/$domain/$date_str/
