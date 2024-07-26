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

# Creates a new custom DC service docker image and tags it latest.
# Also tags it with a custom label from $IMAGE_LABEL.

# Usage: From root, ./scripts/build_cdc_service_and_tag_latest.sh

# The latest image = gcr.io/datcom-ci/datacommons-website-compose:latest

set -e
set -x

if [[ $IMAGE_LABEL = "" ]]; then
  echo "IMAGE_LABEL is not set."
  exit 1
fi

# Build a new image and push it to Container Registry, tagging it as latest
docker build -f build/web_compose/Dockerfile \
  --tag "gcr.io/datcom-ci/datacommons-website-compose:${IMAGE_LABEL}" \
  --tag gcr.io/datcom-ci/datacommons-website-compose:latest \
  .
docker push "gcr.io/datcom-ci/datacommons-website-compose:${IMAGE_LABEL}"
docker push gcr.io/datcom-ci/datacommons-website-compose:latest
