#!/bin/bash
# Copyright 2020 Google LLC
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
if [ $# -ne 1 ]; then
  echo "Usage: $0 <test-index-file>"
  exit 1
fi

# Install all the requirements. Need `nl_server` too since the tool uses it.
cd ../../..
python3 -m venv .env
source .env/bin/activate
cd nl_server
./requirements_install.sh
cd ..
pip3 install -r tools/nl/svindex_differ/requirements.txt

# Get the production embeddings.
PROD=$(curl -s https://raw.githubusercontent.com/datacommonsorg/website/master/deploy/base/model.yaml | awk '{ print $2; }')

# Diff production embeddings against test.
python3 -m tools.nl.svindex_differ.differ --base="$PROD" --test="$1" --queryset=tools/nl/svindex_differ/queryset.csv
