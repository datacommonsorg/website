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

# bash script to run website periodic tests

set -e

echo "Website domain: $WEB_API_ROOT"
echo "Nodejs domain: $NODEJS_API_ROOT"
echo "Testing env: $TESTING_ENV"

export GOOGLE_CLOUD_PROJECT=datcom
export FLASK_ENV=webdriver

echo "====================================================================================="
echo "Starting website cron tests"
echo "====================================================================================="
date_str=$(TZ="America/Los_Angeles" date +"%Y_%m_%d_%H_%M_%S")
echo "  ==================================================================================="

# Run nodejs query tests only if NODEJS_API_ROOT is set.
if [[ $NODEJS_API_ROOT != "" ]]; then
  echo "====================================================================================="
  echo "Starting nodejs tests against domain: $NODEJS_API_ROOT"
  echo "  ==================================================================================="
  python3 nodejs_query.py --base_url="$NODEJS_API_ROOT"
  gsutil cp ./output/* gs://datcom-website-periodic-testing/$TESTING_ENV/$date_str/nodejs_query/
  echo "  Finished the nodejs Test."
  echo "  ==================================================================================="
  rm -rf ./output/*
else
  echo "====================================================================================="
  echo "Skipping nodejs tests because missing NODEJS_API_ROOT"
  echo "  ==================================================================================="
fi

# Run sanity tests
echo "====================================================================================="
echo "Starting sanity tests"
echo "  ==================================================================================="
python3 sanity.py --mode=home --url="$WEB_API_ROOT"
gsutil cp ./output/*.csv gs://datcom-website-periodic-testing/$TESTING_ENV/$date_str/sanity/
rm ./output/*.csv