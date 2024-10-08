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

# Reassigns the customdc_stable tag to the HEAD commit on the specified remote.

set -e

TAG_NAME=customdc_stable

read -p "Enter name of remote where the tag should be created (e.g. upstream, dc): " REMOTE_NAME

git push $REMOTE_NAME :refs/tags/$TAG_NAME
git tag -fa $TAG_NAME
git push $REMOTE_NAME refs/tags/$TAG_NAME

echo "Tag URL: https://github.com/datacommonsorg/website/releases/tag/customdc_stable"

