#!/bin/bash
#
# Copyright 2024 Google LLC
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

# Creates a new custom DC services docker image and tags it stable.
# Also tags it with a custom label from an argument.

# Usage: From root, ./scripts/build_cdc_services_and_tag_stable.sh $IMAGE_LABEL

# The stable image = gcr.io/datcom-ci/datacommons-services:stable

set -e
set -x

commits_label=$1
if [[ $commits_label = "" ]]; then
  echo "Expected positional argument with commits label."
  echo "Usage: ./scripts/build_cdc_services_and_tag_stable.sh \$COMMITS_LABEL"
  exit 1
fi

./scripts/build_and_tag_cdc_image.sh \
  --image-type services \
  --commits-label "${commits_label}" \
  --release-label "stable"
