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
  echo "Usage: <old_eval_sheets_url> <new_eval_sheets_url> <output_sheets_url>"
}

if [[ $# -le 2 ]]; then
  help
  exit 1
fi


python3 -m venv .env
source .env/bin/activate
# pip3 install -r requirements.txt

python3 manual_eval_differ.py --reference_sheets_url=$1 --latest_sheets_url=$2 --output_sheets_url=$3