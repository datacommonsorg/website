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

# Delete GCS folders that are older than this many days
MAX_DAYS_OLD=90
PARENT_FOLDERS=(
  "gs://datcom-website-periodic-testing/bard"
  "gs://datcom-website-periodic-testing/autopush"
  "gs://datcom-website-screenshot/autopush.datacommons.org/"
  "gs://datcom-website-periodic-testing/staging"
  "gs://datcom-website-screenshot/staging.datacommons.org/"
)
CURRENT_TS=$(TZ="America/Los_Angeles" date +"%s")

for parent_folder in "${PARENT_FOLDERS[@]}"; do
  echo "deleting outdated folders in $parent_folder"
  folders=$(gsutil ls $parent_folder)
  for folder in $folders; do
    folder_name=$(basename $folder)
    # get the folder timestamp from the folder name (which should be a datetime)
    folder_timestamp=$(date -j -f "%Y_%m_%d_%H_%M_%S" "$folder_name" +"%s")
    # get the difference in days between current timestamp and folder timestamp
    timestamp_difference=$((CURRENT_TS - folder_timestamp))
    days_difference=$((timestamp_difference / (60 * 60 * 24)))
    # delete the folder if its older than MAX_DAYS_OLD
    if [[ "$days_difference" -gt "$MAX_DAYS_OLD" ]]; then
      gsutil -m rm -r $folder
      echo "deleted $folder"
    fi
  done
done
