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

BIGTABLE_INFO_FILE="mixer/deploy/storage/base_bigtable_info.yaml"

# Clear and recreate the tables list in the YAML file
yq eval -i 'del(.tables)' $BIGTABLE_INFO_FILE
yq eval -i '.tables = []' $BIGTABLE_INFO_FILE

# Loop through the latest version files in GCS and add them to the YAML
for src in $(gsutil ls gs://datcom-control/autopush/*_latest_base_cache_version.txt); do
  export TABLE="$(gsutil cat "$src")"
  # Skip experimental import group for non-autopush environments
  if [[ $TABLE == experimental* ]] && [[ $ENV != "autopush" ]]; then
    continue
  fi
  echo "Adding table: $TABLE"
  if [[ $TABLE != "" ]]; then
    yq eval -i '.tables += [env(TABLE)]' $BIGTABLE_INFO_FILE
  fi
  cat "$TABLE" | sed 's/^/  /' >> $BIGTABLE_INFO_FILE
done

echo "Successfully updated $BIGTABLE_INFO_FILE"
echo "See the updated file"
cat $BIGTABLE_INFO_FILE
