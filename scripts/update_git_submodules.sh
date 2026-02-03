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
# Usage: ./update_git_submodules.sh from root directory

# Detect the name of the fork remote (i.e. not the main repo 'datacommonsorg')
fork_remote_name=$(git remote -v | grep "(push)" | grep -v "datacommonsorg" | cut -f1 | uniq | head -n 1)

# Fallback to 'origin' if nothing is found (e.g., if checking out main repo directly)
fork_remote_name=${fork_remote_name:-origin}
echo "Detected fork remote name: $fork_remote_name"

# Update submodules
git submodule foreach git pull $fork_remote_name master
git submodule update --init --recursive
