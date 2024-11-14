#!/bin/bash
# Copyright 2024 Google LLC
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

./run_test.sh --setup_python

source .env/bin/activate
export FLASK_ENV=webdriver

# Like run_test.sh, use flag -g for updating goldens.
if [[ "$1" == "-g" ]]; then
  export TEST_MODE=write
fi

python3 -m pytest -n 5 --reruns 2 server/webdriver/cdc_tests/
