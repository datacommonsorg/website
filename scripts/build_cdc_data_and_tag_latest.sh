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


# Creates a new custom DC data docker image and tags it as latest.

# Usage: From root, ./scripts/build_cdc_data_and_tag_latest.sh

# The latest image = gcr.io/datcom-ci/datacommons-data:latest

set -e
set -x

# Initialize all submodules, then merge them with their masters and update
# their pinned versions (locally only).
./scripts/update_git_submodules.sh
./scripts/merge_git_submodules.sh

# Configure Git to create commits with Cloud Build's service account
git config user.email $(gcloud auth list --filter=status:ACTIVE --format='value(account)')

git commit --allow-empty -am "DO NOT PUSH: Temp commit to update pinned submod versions (empty if submods are already up-to-date)"

website_rev="$(git rev-parse --short HEAD)"
# Even though data docker does not use mixer, we use it to generate the tag so that the tags are consistent between data and services docker images.
mixer_rev="$(git rev-parse --short HEAD:mixer)"
import_rev="$(git rev-parse --short HEAD:import)"
image_label="${website_rev}-${mixer_rev}-${import_rev}"

# Build a new image and push it to Container Registry, tagging it as latest
docker build -f build/cdc_data/Dockerfile \
          --tag gcr.io/datcom-ci/datacommons-data:${image_label} \
          --tag gcr.io/datcom-ci/datacommons-data:latest \
          .
docker push gcr.io/datcom-ci/datacommons-data:${image_label}
docker push gcr.io/datcom-ci/datacommons-data:latest
