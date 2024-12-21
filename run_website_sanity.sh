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
# Check if the domain is set
if [[ -z "$domain" ]]; then
  echo "Error: Domain is not set."
  echo "Usage: $0 <domain> [NO_PIP]"
  echo "Example: $0 autopush.datacommons.org"
  exit 1
fi

# Prepend https:// if no protocol is specified
if [[ ! "$domain" =~ ^http:// && ! "$domain" =~ ^https:// ]]; then
  domain="https://$domain"
fi

echo "Domain: $domain"

# Set to true if you don't want to install the dependencies
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
python3 server/webdriver/tests/standalone/sanity.py --mode=home --url="$domain"
gsutil cp ./output/*.csv gs://datcom-website-sanity/$domain/$date_str/
rm ./output/*.csv
