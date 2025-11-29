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

# Make in-directory copies of Node package files.
# Run again with `--cleanup` to remove them.

set -e

module_directories=(
    "static"
    "packages/client"
    "packages/web-components"
)

# Make sure this script is being run from its directory
if [[ ! -f "copy_package_files.sh" ]]; then
  echo "Error: This script must be run from its own directory."
  exit 1
fi

cleanup="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cleanup)
      cleanup="true"
      shift
      ;;
    *)
      echo "Unknown parameter: $1"
      exit 1
      ;;
  esac
done

if [[ "$cleanup" == "true" ]]; then
  echo "Cleaning up copies of package files..."
  for module_directory in "${module_directories[@]}"; do
    rm -rf ${module_directory}
  done
else
  echo "Creating copies of package files..."
  for module_directory in "${module_directories[@]}"; do
    mkdir -p ${module_directory}
    cp ../../${module_directory}/package.json ${module_directory}
    cp ../../${module_directory}/package-lock.json ${module_directory}
  done
fi
