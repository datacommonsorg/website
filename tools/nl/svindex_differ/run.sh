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

# Must provide the test index file.
if [ $# -ne 2 ]; then
  echo "Usage: $0 (small | medium) <test-index-file>"
  exit 1
fi

SIZE="$1"

# Install all the requirements. Need `nl_server` too since the tool uses it.
cd ../../..
python3 -m venv .env
source .env/bin/activate
python3 -m pip install --upgrade pip setuptools light-the-torch
ltt install torch --cpuonly
pip3 install -r nl_server/requirements.txt
pip3 install -r tools/nl/svindex_differ/requirements.txt

# Get the production embeddings.
PROD=$(curl -s https://raw.githubusercontent.com/datacommonsorg/website/master/deploy/nl/embeddings.yaml | awk '$1=="'$SIZE':"{ print $2; }')

# Diff production embeddings against test.
python3 -m tools.nl.svindex_differ.differ --base="$PROD" --test="$2" --queryset=tools/nl/svindex_differ/queryset_vars.csv
