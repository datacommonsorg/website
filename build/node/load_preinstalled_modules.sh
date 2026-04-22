#!/bin/bash

# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Speeds up Node setup step for website build triggers.
#
# Use with gcr.io/datcom-ci/node, which has pre-installed node_modules directories.
# This script copies those node_modules into each folder with package.json,
# then disables npm audit, so that modules don't need to be fetched.
#
# After running this script, ./run_test.sh -b is slightly faster.

set -e

module_directories=(
  "static"
  "packages/client"
  "packages/web-components"
)

for module_directory in "${module_directories[@]}"; do
  rm -rf "${module_directory}/node_modules"
  cp -r "/resources/${module_directory}/node_modules" -d "${module_directory}"
done

npm set audit false
