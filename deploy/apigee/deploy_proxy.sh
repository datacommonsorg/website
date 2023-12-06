#!/bin/bash
# Copyright 2019 Google LLC
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

# Apigee proxy setup
# Reference: https://cloud.google.com/apigee/docs/api-platform/get-started/install-cli

set -e

ENV=$1

if [[ $ENV == "" ]]; then
  echo "Missing arg 1 (env)"
  exit 1
fi

PROJECT_ID=$(yq eval '.project' config.yaml)
AUTH="$(gcloud auth print-access-token)"
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
ENVIRONMENT_NAME=website-environment
APIGEE_CONFIG_PATH=../deploy/apigee
PROXY_NAME=root

gcloud config set project $PROJECT_ID

echo "*** Deploying apigee proxy configuration $ENV to $PROJECT_ID"

cd $APIGEE_CONFIG_PATH/$ENV/
zip -r ${ENV}.zip apiproxy/
cd -

echo "*** Creating proxy using configuration $APIGEE_CONFIG_PATH/$ENV/$ENV.zip"
curl -X POST -H "Authorization: Bearer $AUTH" \
  -H "Content-Type:multipart/form-data" \
  "https://apigee.googleapis.com/v1/organizations/$PROJECT_ID/apis?name=$PROXY_NAME&action=import" \
  -F "file=@$APIGEE_CONFIG_PATH/$ENV/$ENV.zip"

REVISION=$(
  curl -X GET -H "Authorization: Bearer $AUTH" \
  "https://apigee.googleapis.com/v1/organizations/$PROJECT_ID/apis/$PROXY_NAME/revisions" \
  | jq -r '.[-1]'
)
echo "*** Latest revision: $REVISION"

echo "*** Deploying proxy to environment"
curl -H "Authorization: Bearer $AUTH" -X POST \
  "https://apigee.googleapis.com/v1/organizations/$PROJECT_ID/environments/$ENVIRONMENT_NAME/apis/$PROXY_NAME/revisions/$REVISION/deployments?override=true"

echo "*** Confirming deployment"
curl -H "Authorization: Bearer $AUTH" \
  "https://apigee.googleapis.com/v1/organizations/$PROJECT_ID/environments/$ENVIRONMENT_NAME/apis/$PROXY_NAME/revisions/$REVISION/deployments"
