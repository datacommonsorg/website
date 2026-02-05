#!/bin/bash

# Copyright 2025 Google LLC
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

# Navigate to the project root directory
cd "$(dirname "$0")/../../.."

# Activate the virtual environment if it exists
if [ -f ".venv/bin/activate" ]; then
  source .venv/bin/activate
else
  echo "Virtual environment not found. Please run './run_test.sh --setup_python' first."
  exit 1
fi

echo "Running tests within tools/nl/nl_metadata:"
pip3 install -r tools/nl/nl_metadata/requirements.txt -q
python3 -m pytest -n auto tools/nl/nl_metadata/ -s "$@"

deactivate
