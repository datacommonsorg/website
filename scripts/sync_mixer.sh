#!/bin/bash
#
# Copyright 2020 Google LLC
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


# Sync mixer submodule to the latest tagged release

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$(dirname "$DIR")"

# Update mixer
cd $ROOT/mixer
git checkout master
git pull origin master
git fetch --all --tags
git pull origin $(git describe --tags --abbrev=0)
cd ..
git add *
git commit -m "Update mixer at $(cd mixer && git describe --tags --abbrev=0)"
echo "Now you should push to your fork, and send a pull request."
