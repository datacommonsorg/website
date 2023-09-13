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


export GOOGLE_CLOUD_PROJECT=datcom-website-dev

python3 -m venv .env
source .env/bin/activate
if [[ $NO_PIP != "true" ]]; then
  python3 -m pip install --upgrade pip setuptools
  pip3 install -r server/requirements.txt
fi

# copy input files
mkdir -p input
gsutil cp gs://datcom-website-adversarial/input/frequent/* input/


dc_list=("main" "sdg")
echo "====================================================================================="
echo "Domain: $domain"
echo "====================================================================================="
date_str=$(TZ="America/Los_Angeles" date +"%Y_%m_%d_%H_%M_%S")
for dc in "${dc_list[@]}"
do
  echo "  ==================================================================================="
  echo "  Executing the Adversarial Test against the $dc index, detection and fulfillment."
  python3 server/integration_tests/standalone/adversarial.py --mode=run_all --dc="$dc" --base_url="https://$domain"
  gsutil cp ./output/$dc/reports/* gs://datcom-website-adversarial/reports/$dc/$domain/$date_str/
  rm -rf ./output/$dc/*
  echo "  Finished the Adversarial Test against the $dc index, detection and fulfillment."
  echo "  ==================================================================================="
done
rm -rf ./input/*
rm -rf ./output/*
