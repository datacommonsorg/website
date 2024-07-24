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

# Build CDC data Docker image with a test image tag and push to Cloud Container Registry.

set -e

IMAGE_TAG=$1

if [[ $IMAGE_TAG == "" ]]; then
  echo "No image tag specified." >&2
  echo "Usage ./scripts/push_cdc_data_image.sh my-test-image-tag" >&2
  exit 1
fi

set -x

gcloud builds submit . \
  --async \
  --project=datcom-ci \
  --config=build/ci/cloudbuild.push_cdc_data_image.yaml \
  --substitutions=_TAG=$IMAGE_TAG
