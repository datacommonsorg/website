#!/bin/bash
# Copyright 2020 Google LLC
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

# Build Docker image and push to Cloud Container Registry

cd ../
gcloud auth login
gcloud config set project datcom-ci
export TAG="$(git rev-parse --short HEAD)"
DOCKER_BUILDKIT=1 docker build --tag gcr.io/datcom-ci/website:$TAG .
DOCKER_BUILDKIT=1 docker build --tag gcr.io/datcom-ci/website:latest .
docker push gcr.io/datcom-ci/website:$TAG
docker push gcr.io/datcom-ci/website:latest
cd deployment