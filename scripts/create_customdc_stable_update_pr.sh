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

# Opens a PR to merge new changes into the custom DC stable branch.

set -e

MASTER_BRANCH=master
STABLE_BRANCH=customdc_stable
UPDATE_BRANCH=cdcStableUpdate

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
  echo "GitHub CLI is not installed. Please install it to continue."
  echo "You can find installation instructions at https://cli.github.com"
  exit 1
fi

# Check if the user is authorized with GitHub CLI
if ! gh auth status &> /dev/null; then
  echo "You are not logged in to GitHub CLI."
  echo "Please run 'gh auth login' to authenticate."
  exit 1
fi

# Check if GitHub CLI default repository is set
if gh repo set-default --view 2>&1 >/dev/null | grep "no default repository"; then
  # No default repository is set for GitHub CLI.
  # We don't have to print an error message because the above already prints one.
  echo "Choose your *forked repo* as the default."
  exit 1
fi

# Find the remote associated with the main repo
upstream_name=$(git remote -v | grep "datacommonsorg" | awk '{print $1}' | head -n 1)
if [ -z "$upstream_name" ]; then
  echo "No remote found with 'datacommonsorg' in its URL."
  exit 1
fi
echo "Remote for main repo is '${upstream_name}'".

# Find the remote associated with the forked repo
fork_name=$(git remote -v | grep -v "datacommonsorg" | awk '{print $1}' | head -n 1)
if [ -z "$fork_name" ]; then
  echo "No remote found without 'datacommonsorg' in its URL."
  exit 1
fi
echo "Remote for forked repo is '${fork_name}'".

# Check whether a local update branch already exists.
if git show-ref --verify --quiet "refs/heads/${UPDATE_BRANCH}"; then
  echo "A local branch named '${UPDATE_BRANCH}' already exists."
  echo "Delete it, then re-run this script."
  exit 1
fi

# Check whether a remote update branch already exists.
if git ls-remote --heads "$fork_name" "$UPDATE_BRANCH" | grep -q "$UPDATE_BRANCH"; then
  echo "A branch named '${UPDATE_BRANCH}' already exists on remote '${fork_name}'".
  echo "Delete it, then re-run this script."
  exit 1
fi

# Fetch relevant branches from the main repo
git fetch $upstream_name $MASTER_BRANCH $STABLE_BRANCH

# Show the user the commits that are in master but not in customdc_stable
echo ""
echo "The following commits are in ${MASTER_BRANCH} but not in ${STABLE_BRANCH}:"
echo ""
git log --pretty=format:"%h %s" ${upstream_name}/${STABLE_BRANCH}..${upstream_name}/${MASTER_BRANCH} --reverse
echo ""

# Ask the user to select a commit
read -p "Enter the commit hash to create the branch from: " commit_hash

# Create a new branch at the selected commit
git checkout -b "$UPDATE_BRANCH" "$commit_hash"

# Get the current date in YYYY-MM-DD format
current_date=$(date +%Y-%m-%d)

echo "Creating PR..."

# Open a draft PR using GitHub CLI
gh pr create \
  --repo datacommonsorg/website \
  --base customdc_stable \
  --head "${fork_name}:${UPDATE_BRANCH}" \
  --title "$current_date Custom DC stable release" \
  --body "TODO: Summarize changes since last stable release." \
  --draft
