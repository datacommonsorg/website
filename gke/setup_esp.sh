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

CONFIG_YAML="../deploy/helm_charts/envs/$1.yaml"

PROJECT_ID=$(yq eval '.project' $CONFIG_YAML)

export SERVICE_NAME="website-esp.endpoints.$PROJECT_ID.cloud.goog"
export API_TITLE=$SERVICE_NAME

# ESP service configuration
cp endpoints.yaml.tpl endpoints.yaml
yq eval -i '.name = env(SERVICE_NAME)' endpoints.yaml
yq eval -i '.title = env(API_TITLE)' endpoints.yaml

## Deploy ESP configuration
gsutil cp gs://datcom-mixer-grpc/mixer-grpc/mixer-grpc.latest.pb .
gcloud endpoints services deploy mixer-grpc.latest.pb endpoints.yaml --project $PROJECT_ID
gcloud services enable $SERVICE_NAME