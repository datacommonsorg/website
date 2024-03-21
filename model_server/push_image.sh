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

set -e

REGISTRY=us-central1-docker.pkg.dev/datcom-ci/models/embedding-model

WEBSITE_HASH=$(git rev-parse --short=7 HEAD)

gsutil cp -r gs://datcom-nl-models/ft_final_v20230717230459.all-MiniLM-L6-v2/ ./

docker build \
  --tag $REGISTRY:$WEBSITE_HASH \
  -f Dockerfile .

docker push $REGISTRY:$WEBSITE_HASH