#!/bin/bash

# Copyright 2025 Google LLC
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

if [[ "$(basename "$PWD")" != "gke" ]]; then
  echo "This script must be run from the 'gke' directory."
  exit 1
fi

INSTANCE_SIZE_GB="10"
REDIS_VERSION="redis_5_0"

TARGET=$1
ENV=$2
REGION=$3

if [[ $TARGET == "" || $ENV == "" || $REGION == "" ]]; then
  echo "Usage: $0 <target> <env> <region>"
  echo "Example: $0 mixer-standalone prod us-central1"
  exit 1
fi

if [[ $TARGET == "website" ]]; then
  INSTANCE_ID="webserver-cache"
elif [[ $TARGET == "mixer-website" || $TARGET == "mixer-standalone" ]]; then
  INSTANCE_ID="mixer-cache"
else
  echo "Error: app must be 'website', 'mixer-website', or 'mixer-standalone'"
  exit 1
fi

if [[ $TARGET == "website" || $TARGET == "mixer-website" ]]; then
  CONFIG_YAML="../deploy/helm_charts/envs/$ENV.yaml"
elif [[ $TARGET == "mixer-standalone" ]]; then
  CONFIG_YAML="../mixer/deploy/gke/$ENV.yaml"
fi
PROJECT_ID=$(yq eval '.project' $CONFIG_YAML)

gcloud config set project $PROJECT_ID

gcloud services enable redis.googleapis.com

gcloud redis instances create $INSTANCE_ID \
  --size=$INSTANCE_SIZE_GB \
  --region=$REGION \
  --redis-version=$REDIS_VERSION

gcloud redis instances describe $INSTANCE_ID --region=$REGION
