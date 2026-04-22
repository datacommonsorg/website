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

# Store original branch to return to it later
original_branch=$(git branch --show-current)

cleanup() {
  if [[ -n "$original_branch" ]]; then
    # Quietly return to the original branch
    git checkout "$original_branch" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# Check if working directory is clean before proceeding
if ! git diff-index --quiet HEAD --; then
  echo "Error: Working directory is not clean. Commit or stash your changes before running this script."
  exit 1
fi

# Find the remote associated with the main repo
# The tag operations later in the script require a remote using SSH authentication.
# If there are multiple remotes with 'git@github.com:datacommonsorg' in their URL, pick the first one
upstream_remote=$(git remote -v | awk '/git@github.com:datacommonsorg/ && /(push)/ {print $1; exit}')
if [ -z "$upstream_remote" ]; then
  echo "No remote found with 'git@github.com:datacommonsorg' in its URL. Make sure you have a remote using SSH authentication added."
  exit 1
fi
echo "Remote for main repo is '${upstream_remote}'".

# Check out the latest release tag
# Because the prod tag might be out of sync, we use --force to fetch.
# Check if the fetch will overwrite existing tags, and ask user for confirmation
fetch_dry_run_output=$(git fetch "$upstream_remote" --tags --force --dry-run 2>&1 || true)
if [[ "$fetch_dry_run_output" == *"[tag update]"* ]]; then
  echo "Warning: The following tags will be overwritten by this fetch:"
  echo "$fetch_dry_run_output" | grep '\[tag update\]'
  read -r -p "Do you want to continue and overwrite these tags? [y/N] " fetch_response
  if [[ ! "$fetch_response" =~ ^[Yy]([Ee][Ss])?$ ]]; then
    echo "Aborting..."
    exit 0
  fi
fi

# If we get here, the user approved the fetch.
# Fetch and checkout latest release
# The latest tag will start with the letter "v", example "v2.0.12".
# sort -V uses "version" sorting to get the latest tag
git fetch "$upstream_remote" --tags --force
latest_release_tag=$(git ls-remote --tags --refs "$upstream_remote" "v*" | awk '{print $2}' | sed 's#^refs/tags/##' | sort -V | tail -n1)
if [[ -z "$latest_release_tag" ]]; then
  echo "Error: Could not find any release tags (v*) on the remote."
  exit 1
fi
git checkout "$latest_release_tag"

# Confirm before updating the tag
read -r -p "Update the website prod tag to point to '$latest_release_tag'? [y/N] " response
if [[ ! "$response" =~ ^[Yy]([Ee][Ss])?$ ]]; then
  echo "Aborting..."
  exit 0
fi

# Force-update the 'prod' tag to the current commit and push to remote
git tag --force prod
git push --force "$upstream_remote" refs/tags/prod
