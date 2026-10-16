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
# The image tag must be specified as the first argument, with an optional GCP project ID
# as the second argument (defaults to datcom-ci):
# Usage: ./scripts/push_cdc_data_image.sh <image-tag> [project-id]
# e.g. ./scripts/push_cdc_data_image.sh my-test-image-tag datcom-website-dev

set -e

IMAGE_TAG=$1
PROJECT_ID=${2:-datcom-ci}

if [[ $IMAGE_TAG == "" ]]; then
  echo "No image tag specified." >&2
  echo "Usage ./scripts/push_cdc_data_image.sh my-test-image-tag [project-id]" >&2
  exit 1
fi

set -x

gcloud builds submit . \
  --async \
  --project=$PROJECT_ID \
  --config=build/ci/cloudbuild.push_cdc_data_image.yaml \
  --substitutions=_TAG=$IMAGE_TAG,_PROJECT_ID=$PROJECT_ID
