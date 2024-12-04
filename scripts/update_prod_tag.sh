#!/bin/bash

# Copyright 2024 Google LLC
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

# Updates the prod tag to point to the latest semantically versioned release.

set -e
set -o pipefail

# Find the remote associated with the main repo
upstream_remote=$(git remote -v | grep "datacommonsorg" | cut -f1 | uniq)
if [ -z "$upstream_remote" ]; then
  echo "No remote found with 'datacommonsorg' in its URL."
  exit 1
fi
echo "Remote for main repo is '${upstream_remote}'".

# Check out the latest release tag
# The latest tag will start with the letter "v", example "v2.0.12".
# sort -V uses "version" sorting to get the latest tag
git fetch "$upstream_remote" --tags
latest_release_tag=$(git tag -l "v*" | sort -V | tail -n1)
git checkout "$latest_release_tag"

# Confirm before updating the tag
read -r -p "Update the website prod tag to point to '$latest_release_tag'? [y/n] " response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
  echo "Aborting..."
  exit 0
fi

# Delete the old prod tag locally and remotely
git tag -d prod
git push "$upstream_remote" :refs/tags/prod

# Tag release as prod & push to github
git tag prod
git push "$upstream_remote" prod
