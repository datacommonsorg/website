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

PROJECT_ID=$1

if [[ $PROJECT_ID == "" ]]; then
  PROJECT_ID=datcom-ci
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$(dirname "$DIR")"

cd $ROOT
gcloud builds submit . \
  --async \
  --project=$PROJECT_ID \
  --config=build/ci/cloudbuild.push_image.yaml \
  --substitutions=_TAG=$(git rev-parse --short=7 HEAD),_PROJECT_ID=$PROJECT_ID
