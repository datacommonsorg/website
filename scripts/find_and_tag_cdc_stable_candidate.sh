#!/bin/bash
# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
set -e

###### BEGIN CONFIG ######

# Tag of the website commit that we'll attempt to find a matching CDC image for.
WEBSITE_PROD_TAG="prod"

# Tag to be added to the CDC image that is found.
STABLE_CANDIDATE_TAG="stable-candidate"

# Path to CDC images in Container Registry.
WEB_COMPOSE_IMAGE_PATH="gcr.io/datcom-ci/datacommons-website-compose"

###### END CONFIG ######

# Fetch information on what is currently in website prod.
remote=$(git remote -v | grep "datacommonsorg/website" | cut -f1 | uniq)
git fetch "$remote" tag $WEBSITE_PROD_TAG --no-tags

# Construct the tag that the matching CDC image should be labeled with.
website_rev="$(git rev-parse --short ${WEBSITE_PROD_TAG})"
mixer_rev="$(git rev-parse --short ${WEBSITE_PROD_TAG}:mixer)"
import_rev="$(git rev-parse --short ${WEBSITE_PROD_TAG}:import)"
cdc_image_label="${website_rev}-${mixer_rev}-${import_rev}"
echo "Looking for an image with tag ${cdc_image_label}"

# Check if an image with that label exists.
matching_image_digest=$(gcloud container images list-tags "$WEB_COMPOSE_IMAGE_PATH" |
  sed -nr "s/([a-z0-9]{12}).*${cdc_image_label}.*/\1/p")
if [[ $matching_image_digest == "" ]]; then
  echo "\
No container image corresponding to current website prod was found. \
This can happen if website prod does not have the latest mixer and import as \
submodules (i.e. if merging submodules before release was skipped)." \
    >&2
  exit 1
fi

# Add the stable candidate tag to the image with that label.
gcloud container images add-tag "${WEB_COMPOSE_IMAGE_PATH}:${cdc_image_label}" \
  "${WEB_COMPOSE_IMAGE_PATH}:${STABLE_CANDIDATE_TAG}"
