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

MODEL_NAME=$1
PROJECT_ID=$2

REGISTRY=us-central1-docker.pkg.dev/datcom-ci/models/embedding-model
WEBSITE_HASH=$(git rev-parse --short=7 HEAD)
DISPLAY_NAME=$(echo "${MODEL_NAME}_${WEBSITE_HASH}" | tr '[:upper:]/' '[:lower:]_')

gcloud ai models upload \
  --project=$PROJECT_ID \
  --region=us-central1 \
  --display-name=$DISPLAY_NAME \
  --container-image-uri=$REGISTRY:$WEBSITE_HASH \
  --container-env-vars=MODEL_NAME=$MODEL_NAME \
  --container-predict-route=/predict \
  --container-health-route=/healthz