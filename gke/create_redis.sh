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

ENV=$1
REGION=$2

if [[ $ENV == "" || $REGION == "" ]]; then
  echo "Missing arg 1 (env) and/or arg 2 (region)"
  exit 1
fi

CONFIG_YAML="../deploy/helm_charts/envs/$1.yaml"

PROJECT_ID=$(yq eval '.project' $CONFIG_YAML)

gcloud config set project $PROJECT_ID

gcloud services enable redis.googleapis.com

# Create 10G redis cache
gcloud redis instances create webserver-cache --size=10 --region=$REGION \
    --redis-version=redis_5_0

gcloud redis instances describe webserver-cache --region=$REGION