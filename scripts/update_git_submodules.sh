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
# 
# Requires: git to be installed
#
# Usage: ./scripts/update_git_submodules.sh from root directory

# Find the remote associated with the main repo
# If there are multiple remotes with 'datacommonsorg' in their URL, pick the first one
upstream_remote=$(git remote -v | grep "datacommonsorg" | grep "(push)" | cut -f1 | head -n 1)
if [ -z "$upstream_remote" ]; then
  echo "No remote found with 'datacommonsorg' in its URL."
  exit 1
fi
echo "Remote for main repo is '${upstream_remote}'".

# Update submodules
git submodule foreach git pull $upstream_remote master
git submodule update --init --recursive
