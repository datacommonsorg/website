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

function help {
  echo "Usage: $0 -ebt"
  echo "-e       Instance environment to get diffs for"
  echo "-t       folder to test"
  echo "-g       gcs folder to output differ results to"
  echo "-f       file to output a email template to if there are diffs."
  exit 1
}

while getopts ":e:t:g:f:" OPTION; do
  case $OPTION in
    e)
      ENV=$OPTARG
      ;;
    t)
      TEST=$OPTARG
      ;;
    g)
      GCS_OUTPUT=$OPTARG
      ;;
    f)
      FAILURE_EMAIL=$OPTARG
      ;;
    *)
      help
      ;;
  esac
done

python3 -m venv .env
source .env/bin/activate
python3 -m pip install --upgrade pip setuptools
python3 -m pip install -r requirements.txt

# Diff production embeddings against test.
python3 differ.py --env=$ENV --test_folder=$TEST --gcs_output_folder=$GCS_OUTPUT --failure_email_file=$FAILURE_EMAIL
