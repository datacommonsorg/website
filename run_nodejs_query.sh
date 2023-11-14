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

# bash script to run nodejs query tests and save output to gs://datcom-website-periodic-testing

set -e

# Instance environment as defined under ../deploy/gke. Defaults to dev and only dev is currently supported.
ENV="dev"
DOMAIN="https://dev.datacommons.org"

if [[ $1 != "" ]]; then
  ENV=$1
  DOMAIN=""
fi

#TODO: If more environments are enabled, set the domain depending on the environment.

echo "Environment: $ENV"

NO_PIP=$2

export GOOGLE_CLOUD_PROJECT=datcom

python3 -m venv .env
source .env/bin/activate
if [[ $NO_PIP != "true" ]]; then
  python3 -m pip install --upgrade pip setuptools
  pip3 install -r server/requirements.txt
fi

echo "====================================================================================="
echo "Starting nodejs tests against domain: $DOMAIN"
echo "====================================================================================="
date_str=$(TZ="America/Los_Angeles" date +"%Y_%m_%d_%H_%M_%S")
echo "  ==================================================================================="
python3 server/integration_tests/standalone/nodejs_query.py --base_url="$DOMAIN"
gsutil cp ./output/* gs://datcom-website-periodic-testing/$ENV/$date_str/nodejs_query/
echo "  Finished the nodejs Test."
echo "  ==================================================================================="

rm -rf ./output/*

