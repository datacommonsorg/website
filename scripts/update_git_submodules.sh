#!/bin/bash
# Copyright 2023 Google LLC
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


# Convenience script for updating git submodules
# This will sync each submodule with the latest master branch from datacommonsorg
# 
# Requires: git to be installed
#
# Usage: ./scripts/update_git_submodules.sh from root directory


# Helper function to pull latest master branch from datacommonsorg remote
pull_upstream_master() {
  # Find the name of the remote associated with the main datacommonsorg repo
  # If there are multiple remotes with 'datacommonsorg' in their URL, pick the first one
  upstream_remote=$(git remote -v | awk '/datacommonsorg/ && /\(push\)/ {print $1; exit}')
  if [ -z "$upstream_remote" ]; then
    echo "No remote found with 'datacommonsorg' in its URL."
    exit 1
  fi
  echo "Remote for submodule is '${upstream_remote}'"

  # Pull from master branch of datacommonsorg remote
  git pull $upstream_remote master
}
export -f pull_upstream_master

# Update submodules
git submodule foreach 'bash -c pull_upstream_master'
git submodule update --init --recursive
