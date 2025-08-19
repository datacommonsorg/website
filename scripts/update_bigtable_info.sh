#!/bin/bash
#
# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Updates the base_bigtable_info.yaml file with the latest cache versions from GCS.
# This script is self-contained and does not require external dependencies like yq.

set -e

ENV=$1
if [[ $ENV == "" ]]; then
  echo "Usage: $0 <ENV>"
  exit 1
fi

echo "Updating Bigtable info for env: $ENV"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$(dirname "$DIR")"
cd $ROOT

# Write to a new, generated file at the root to avoid workspace caching issues.
OUTPUT_FILE="generated_bigtable_info.yaml"

# Overwrite the file with the static header
# Note: This assumes the project and instance are static. If they need to be
# dynamic, this script will need to be updated.
echo "project: datcom-store" > $OUTPUT_FILE
echo "instance: prophet-cache" >> $OUTPUT_FILE
echo "tables:" >> $OUTPUT_FILE

# Loop through the latest version files in GCS and append table names to the YAML
for src in $(gsutil ls gs://datcom-control/autopush/*_latest_base_cache_version.txt); do
  TABLE="$(gsutil cat "$src")"
  # Skip experimental import group for non-autopush environments
  if [[ $TABLE == experimental* ]] && [[ $ENV != "autopush" ]]; then
    continue
  fi
  echo "Adding table: $TABLE"
  if [[ $TABLE != "" ]]; then
    # Append the table to the file in YAML list format
    echo "  - $TABLE" >> $OUTPUT_FILE
  fi
done

echo "Successfully generated $OUTPUT_FILE"
echo "See the generated file:"
cat $OUTPUT_FILE
