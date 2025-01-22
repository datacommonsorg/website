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

# Facilitates opening a PR to merge new changes into the custom DC stable branch.
# - Prompts for what commit to release at
# - Creates local and remote branches at that commit
# - Opens a web browser with pre-filled PR details

# Usage:
#   ./scripts/create_customdc_stable_update_pr.sh

# If the script fails and you need to clean up old branches:
#   ./scripts/create_customdc_stable_update_pr.sh --delete

# To skip branch creation and reuse existing branches:
#   ./scripts/create_customdc_stable_update_pr.sh --reuse

set -e

MASTER_BRANCH=master
STABLE_BRANCH=customdc_stable
UPDATE_BRANCH=cdcStableUpdate

# Parse option flag if present
mode="create"
if [[ "$1" == "--delete" ]]; then
  mode="delete"
elif [[ "$1" == "--reuse" ]]; then
  mode="reuse"
elif [[ "$1" != "" ]]; then
  echo "Unknown option: $1"
  echo "Available options are '--delete' and '--reuse'."
  exit 1
fi

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
  echo "Choose datacommonsorg/website as the default."
  exit 1
fi

# Find the remote associated with the main repo
upstream_remote=$(git remote -v | grep "datacommonsorg" | awk '{print $1}' | head -n 1)
if [ -z "$upstream_remote" ]; then
  echo "No remote found with 'datacommonsorg' in its URL."
  exit 1
fi
echo "Remote for main repo is '${upstream_remote}'".

# Find the remote associated with the forked repo
fork_remote=$(git remote -v | grep -v "datacommonsorg" | awk '{print $1}' | head -n 1)
if [ -z "$fork_remote" ]; then
  echo "No remote found without 'datacommonsorg' in its URL."
  exit 1
fi
echo "Remote for forked repo is '${fork_remote}'".

fork_owner=$(gh repo view $(git remote get-url origin) --json owner --jq '.owner.login')
fork_name=$(gh repo view $(git remote get-url origin) --json name --jq '.name')
echo "${fork_remote} = ${fork_owner}/${fork_name}"
echo ""

# If delete flag is specified, delete local and remote branches then exit.
if [[ $mode == "delete" ]]; then
  if ! git merge-base --is-ancestor "${fork_remote}/${UPDATE_BRANCH}" "${upstream_remote}/${MASTER_BRANCH}"; then
    echo "Remote branch "${fork_remote}/${UPDATE_BRANCH}" has unmerged changes. Not deleting."
    exit 1
  fi
  echo "Deleting branch ${UPDATE_BRANCH} on both local and remote..."
  git branch -d "$UPDATE_BRANCH" || true
  git push "$fork_remote" --delete "$UPDATE_BRANCH"
  echo ""
  echo "Ready to re-run without '--delete'."
  exit 0
fi

# Check whether a local update branch already exists.
if git show-ref --verify --quiet "refs/heads/${UPDATE_BRANCH}"; then
  # Fail unless mode is reuse
  if [[ $mode != "reuse" ]]; then
    echo "A local branch named '${UPDATE_BRANCH}' already exists."
    echo "Run with '--delete' to remove it or '--reuse' to use it."
    exit 1
  fi
elif [[ $mode == "reuse" ]]; then
  echo "Local branch '${UPDATE_BRANCH}' does not exist."
  echo "Run without '--reuse' to create it."
fi

# Check whether a remote update branch already exists.
if git ls-remote --heads "$fork_remote" "$UPDATE_BRANCH" | grep -q "$UPDATE_BRANCH"; then
  if [[ $mode != "reuse" ]]; then
    echo "A branch named '${UPDATE_BRANCH}' already exists on remote '${fork_remote}'".
    echo "Run with '--delete' to remove it or '--reuse' to use it."
    exit 1
  fi
elif [[ $mode == "reuse" ]]; then
  echo "Remote branch '${UPDATE_BRANCH}' does not exist."
  echo "Run without '--reuse' to create it."
fi

if [[ $mode == "create" ]]; then
  # Fetch relevant branches from the main repo
  git fetch $upstream_remote $MASTER_BRANCH $STABLE_BRANCH

  # Show the user the commits that are in master but not in customdc_stable
  echo ""
  echo "The following commits are in ${MASTER_BRANCH} but not in ${STABLE_BRANCH}:"
  echo ""
  git log --pretty=format:"%h %s" ${upstream_remote}/${STABLE_BRANCH}..${upstream_remote}/${MASTER_BRANCH} --reverse
  echo ""

  # Ask the user to select a commit
  read -p "Enter the commit hash to create the branch from: " commit_hash

  # Create a new branch at the selected commit
  git branch "$UPDATE_BRANCH" "$commit_hash"
  git push -u $fork_remote $UPDATE_BRANCH
fi

# Get the current date in YYYY-MM-DD format
current_date=$(date +%Y-%m-%d)

# Construct the PR body
pr_body="# Highlights
- **TODO** List changes to custom DC since last stable release"

# Add temporary reference links to PR body
generate_comparison_url() {
  local submod_name=$1
  local stable_commit=$(git rev-parse --short "$upstream_remote/$STABLE_BRANCH:${submod_name}")
  local update_commit=$(git rev-parse --short "$UPDATE_BRANCH:${submod_name}")
  echo "https://github.com/datacommonsorg/${submod_name}/compare/${stable_commit}...${update_commit}"
}
mixer_comparison_url=$(generate_comparison_url mixer)
import_comparison_url=$(generate_comparison_url import)
pr_body+="

# Resources - REMOVE BEFORE MERGING
- Diff links to help with writing highlights:
  - Mixer: ${mixer_comparison_url}
  - Import: ${import_comparison_url}
- Website changes are listed on this page.
- If you're unsure what affects custom DC, please message the team."

# Get a PR creation link using GitHub CLI
echo "Getting PR creation link..."
# Intercept attempts to open a web browser and print the URL instead.
# Use stderr instead of stdout so regular output "Opening browser" can be hidden
export GH_BROWSER="./scripts/echo_to_stderr.sh"
gh pr create \
  --repo datacommonsorg/website \
  --base customdc_stable \
  --head "${fork_owner}:${fork_name}:${UPDATE_BRANCH}" \
  --title "$current_date Custom DC stable release" \
  --body "$pr_body" \
  --web > /dev/null

echo -e "\n$(tput bold)Please follow the link above to create a release PR.$(tput sgr0)"
