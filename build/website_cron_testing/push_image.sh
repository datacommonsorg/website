#!/bin/bash
# Copyright 2022 Google LLC
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

# Build Docker image and push to Cloud Container Registry

set -e

gcloud config set project datcom-ci

# TODO: find a less hacky way to do this
cp ../../server/integration_tests/standalone/nodejs_query.py .
cp ../../server/webdriver/tests/standalone/sanity.py .

gcloud builds submit . \
  --config=cloudbuild.yaml \
  --substitutions=_TAG=$(git rev-parse --short=7 HEAD)

rm nodejs_query.py sanity.py