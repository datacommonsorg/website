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

if [ $# -ne 1 -a $# -ne 2 ]; then
  echo "Usage: $0 <BASE_INDEX> [<TEST_INDEX>]"
  exit 1
fi

BASE=$1
# TEST same as BASE if second arg is not set
TEST=${2:-$BASE}


# Install all the requirements. Need `nl_server` too since the tool uses it.
cd ../../..
python3 -m venv .env
source .env/bin/activate
python3 -m pip install --upgrade pip
pip3 install torch==2.2.2 --extra-index-url https://download.pytorch.org/whl/cpu
pip3 install -r nl_server/requirements.txt
pip3 install -r tools/nl/svindex_differ/requirements.txt

# Set TOKENIZERS_PARALLELISM to false to solve a warning from huggingface's
# transfomers library as mentioned here:
# https://stackoverflow.com/questions/62691279/how-to-disable-tokenizers-parallelism-true-false-warning
export TOKENIZERS_PARALLELISM=false

# Diff production embeddings against test.
python3 -m tools.nl.svindex_differ.differ \
  --base_index="$BASE" --test_index="$TEST" \
  --queryset=tools/nl/svindex_differ/queryset_vars.csv
