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

# Creates a new custom DC data docker image and tags it latest.
# Also tags it with a custom label read from the specified file.

# Usage: From root, ./scripts/build_cdc_data_and_tag_latest.sh $IMAGE_LABEL_PATH

# The latest image = gcr.io/datcom-ci/datacommons-data:latest

set -e
set -x

# Check for image label, which is set after submodules are updated.
image_label_path=$1
if [[ $image_label_path = "" ]]; then
  echo "Expected positional argument with image label file path."
  exit 1
fi
image_label=$(cat "$image_label_path")
if [ "$image_label" = "" ]; then
  echo "Image label file is invalid."
  exit 1
fi

# Build a new image and push it to Container Registry, tagging it as latest
docker build -f build/cdc_data/Dockerfile \
  --tag "gcr.io/datcom-ci/datacommons-data:${image_label}" \
  --tag gcr.io/datcom-ci/datacommons-data:latest \
  .
docker push "gcr.io/datcom-ci/datacommons-data:${image_label}"
docker push gcr.io/datcom-ci/datacommons-data:latest
