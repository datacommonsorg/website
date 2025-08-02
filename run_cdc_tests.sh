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

test_filter=""
# Like run_test.sh, use flag -g for updating goldens.
if [[ "$1" == "-g" ]]; then
  export TEST_MODE=write
  shift # Remove -g from arguments, so pytest doesn't see it.
fi

if [[ "$1" == "--smoke_test" ]]; then
  test_filter="smoke_test"
  shift
fi

pytest_args=("-n" "auto" "--reruns" "2")
if [[ -n "${test_filter}" ]]; then
  pytest_args+=("-m" "${test_filter}")
fi

python3 -m pytest "${pytest_args[@]}" server/webdriver/cdc_tests/ "$@"
