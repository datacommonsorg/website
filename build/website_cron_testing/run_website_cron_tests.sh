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
echo "====================================================================================="

# Run nodejs query tests if NODEJS_API_ROOT is set.
if [[ $NODEJS_API_ROOT != "" ]]; then
  echo "====================================================================================="
  echo "Starting nodejs tests against domain: $NODEJS_API_ROOT"
  echo "====================================================================================="
  python3 nodejs_query.py --base_url="$NODEJS_API_ROOT"
  gsutil cp ./output/* gs://datcom-website-periodic-testing/$TESTING_ENV/$date_str/nodejs_query/
  rm -rf ./output/*
  failure_email="failure_email.json"
  python3 differ.py -m diff -e "$TESTING_ENV" -t "$date_str" -g "$TESTING_ENV/$date_str/nodejs_query" -f "$failure_email"
  if [[ -e "$failure_email" ]]; then
    python3 send_email.py --recipient="datacommons-alerts+tests@google.com" --email_content="$failure_email"
  fi
  echo "Finished the nodejs Test."
  echo "====================================================================================="
  rm -rf ./output/*
else
  echo "====================================================================================="
  echo "Skipping nodejs tests because missing NODEJS_API_ROOT"
  echo "====================================================================================="
fi

# Run sanity tests if ENABLE_SANITY is "true"
if [[ $ENABLE_SANITY == "true" ]]; then
  echo "====================================================================================="
  echo "Starting sanity tests"
  echo "====================================================================================="
  python3 sanity.py --mode=home --url="$WEB_API_ROOT"
  gsutil cp ./output/*.csv gs://datcom-website-periodic-testing/$TESTING_ENV/$date_str/sanity/
  rm ./output/*.csv
  echo "Finished the sanity tests."
  echo "====================================================================================="
else
  echo "====================================================================================="
  echo "Sanity tests disabled."
  echo "====================================================================================="
fi

# Run screenshot tests if SCREENSHOT_DOMAIN is set
if [[ $SCREENSHOT_DOMAIN != "" ]]; then
  echo "====================================================================================="
  echo "Starting screenshot tests on $SCREENSHOT_DOMAIN"
  echo "====================================================================================="
  python3 screenshot.py -d $SCREENSHOT_DOMAIN -u $WEB_API_ROOT
  gsutil -o "GSUtil:parallel_process_count=1" -m cp ./screenshots/*.png ./screenshots/*.json gs://datcom-website-screenshot/$SCREENSHOT_DOMAIN/$date_str/
  rm -rf ./screenshots/*
  echo "Finished the screenshot tests."
  echo "====================================================================================="
else
  echo "====================================================================================="
  echo "Skipping screenshot tests because missing SCREENSHOT_DOMAIN"
  echo "====================================================================================="
fi

# Run adversarial tests if ENABLE_ADVERSARIAL is "true"
if [[ $ENABLE_ADVERSARIAL == "true" ]]; then
  echo "====================================================================================="
  echo "Starting adversarial tests"
  echo "====================================================================================="
  mkdir -p input
  gsutil cp gs://datcom-website-adversarial/input/frequent/* input/
  dc_list=("main" "sdg")
  for dc in "${dc_list[@]}"; do
    echo "====================================================================================="
    echo "Executing the Adversarial Test against the $dc index, detection and fulfillment."
    python3 adversarial.py --mode=run_all --dc="$dc" --base_url="$WEB_API_ROOT"
    gsutil cp ./output/$dc/reports/* gs://datcom-website-periodic-testing/$TESTING_ENV/$date_str/adversarial/$dc/
    rm -rf ./output/$dc/*
    echo "Finished the Adversarial Test against the $dc index, detection and fulfillment."
    echo "====================================================================================="
  done
  rm -rf ./input/*
  rm -rf ./output/*
  echo "Finished the adversarial tests."
  echo "====================================================================================="
else
  echo "====================================================================================="
  echo "Adversarial tests disabled."
  echo "====================================================================================="
fi
