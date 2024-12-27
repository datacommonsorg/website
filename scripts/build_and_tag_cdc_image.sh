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

# Creates a new custom DC data or services docker image and tags it.
# Also tags it with custom labels from arguments.

# Usage: From root, ./scripts/build_and_tag_cdc_image.sh --image-type {data|services} --commits-label \$COMMITS_LABEL --release-label \$RELEASE_LABEL

set -e
set -x

image_type=""
commits_label=""
release_label=""

while [[ $# -gt 0 ]]; do
  case "$1" in
  --image-type)
    image_type="$2"
    shift 2
    ;;
  --commits-label)
    commits_label="$2"
    shift 2
    ;;
  --release-label)
    release_label="$2"
    shift 2
    ;;
  *)
    echo "Unknown option: $1"
    exit 1
    ;;
  esac
done

if [[ $image_type != "data" && $image_type != "services" ]]; then
  echo "Invalid image type: $image_type"
  echo "Usage: ./scripts/build_and_tag_cdc_image.sh --image-type {data|services} --commits-label \$COMMITS_LABEL --release-label \$RELEASE_LABEL"
  exit 1
fi

if [[ $commits_label = "" ]]; then
  echo "Expected named argument --commits-label with image label."
  echo "Usage: ./scripts/build_and_tag_cdc_image.sh --image-type {data|services} --commits-label \$COMMITS_LABEL --release-label \$RELEASE_LABEL"
  exit 1
fi

if [[ $release_label = "" ]]; then
  echo "Expected named argument --release-label with image label."
  echo "Usage: ./scripts/build_and_tag_cdc_image.sh --image-type {data|services} --commits-label \$COMMITS_LABEL --release-label \$RELEASE_LABEL"
  exit 1
fi

if [[ $image_type == "data" ]]; then
  dockerfile="build/cdc_data/Dockerfile"
  image_name="datacommons-data"
elif [[ $image_type == "services" ]]; then
  dockerfile="build/cdc_services/Dockerfile"
  image_name="datacommons-services"
fi

# Check for an existing image with the given commits label.
list_result=$(gcloud container images list-tags gcr.io/datcom-ci/${image_name} --filter="tags=${commits_label}" 2>/dev/null)

if echo "$list_result" | grep -q $commits_label; then
  # Add release label to existing image.
  echo "Image gcr.io/datcom-ci/${image_name}:${commits_label} already exists."
  echo "Tagging existing image with release label."
  gcloud container images add-tag --quiet \
    "gcr.io/datcom-ci/${image_name}:${commits_label}" \
    "gcr.io/datcom-ci/${image_name}:${release_label}"

else
  # Build and push a fresh image, adding commits label and release label.
  docker build -f "$dockerfile" \
    --tag "gcr.io/datcom-ci/${image_name}:${commits_label}" \
    --tag "gcr.io/datcom-ci/${image_name}:${release_label}" \
    .
  docker push "gcr.io/datcom-ci/${image_name}:${commits_label}"
  docker push "gcr.io/datcom-ci/${image_name}:${release_label}"
fi
