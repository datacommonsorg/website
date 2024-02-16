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

python3 -m venv .env
source .env/bin/activate
pip3 install -r requirements.txt

RUN_ASYNC=False

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    -a)
        RUN_ASYNC=True
        ;;
    *)
        echo "Unknown option: $1. Running loadtest with no arguments."
        ;;
    esac
    shift 1
done

python3 loadtest.py --queryset=queryset.csv --run_async=$RUN_ASYNC
