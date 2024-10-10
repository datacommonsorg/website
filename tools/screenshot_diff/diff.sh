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

prod_tag=$(git tag -l "v*" | sort -V | tail -n1)
prod_commit_date=$(git log -1 --date=format:"%Y_%m_%d_%H_%M_%S" --format="%ad" $prod_tag)
latest_commit_date=$(git log -1 --date=format:"%Y_%m_%d_%H_%M_%S" --format="%ad")

prod_screenshot=""
latest_screenshot=""

screenshot_folders=$(gsutil ls gs://datcom-website-screenshot/autopush.datacommons.org/)

# Iterate through all the available screenshots and get the date of the screenshot to use for prod and for latest commit.
# We want to use the earliest screenshots that are later than the commit date.
for folder in $screenshot_folders; do
  folder_name=$(basename $folder)
  if [[ "$folder_name" > "$prod_commit_date" ]]; then
    if [[ -z "$prod_screenshot" || "$folder_name" < "$prod_screenshot" ]]; then
      prod_screenshot="$folder_name"
    fi
  fi
  if [[ "$folder_name" > "$latest_commit_date" ]]; then
    if [[ -z "$latest_screenshot" || "$folder_name" < "$latest_screenshot" ]]; then
      latest_screenshot="$folder_name"
    fi
  fi
done

if [[ -z "$latest_screenshot" ]]; then
  echo "No screenshots found for latest commit. Please manually trigger a website cron testing job and try again once that completes."
  echo ""
  echo "To trigger a website cron testing job, click 'run now' at this link:"
  echo "https://pantheon.corp.google.com/kubernetes/cronjob/us-central1/website-us-central1/website/cron-testing"
else
  echo "To see the screenshot diffs between prod and current master, go to:"
  echo "https://autopush.datacommons.org/screenshot/compare/$prod_screenshot...$latest_screenshot?domain=autopush.datacommons.org"
fi
