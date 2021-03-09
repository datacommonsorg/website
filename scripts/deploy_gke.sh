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


# Script to deploy website to a GKE cluster.
#
# Usage:
#
# ./deploy_key.sh <"autopush"|"staging"|"prod"|"svobs">
#
# First argument is either "svobs", "autopush", "staging" or "prod".
#
# !!! WARNING: Run this script in a clean Git checkout at the desired commit.
#

set -e

ENV=$1
REGION=$2

if [[ $ENV != "staging" && $ENV != "prod" && $ENV != "autopush" && $ENV != "svobs" ]]; then
  echo "First argument should be 'staging' or 'prod' or 'autopush' or 'svobs'"
  exit
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$(dirname "$DIR")"

cd $ROOT
WEBSITE_HASH=$(git rev-parse --short HEAD)

cd $ROOT/mixer
MIXER_HASH=$(git rev-parse --short HEAD)

cd $ROOT/deploy/git

echo $WEBSITE_HASH > website_hash.txt
echo $MIXER_HASH > mixer_hash.txt

cd $ROOT
PROJECT_ID=$(yq read $ROOT/deploy/gke/$ENV.yaml project)
CLUSTER_NAME=website-$REGION

cd $ROOT/deploy/overlays/$ENV

# Deploy to GKE
kustomize edit set image gcr.io/datcom-ci/datacommons-website=gcr.io/datcom-ci/datacommons-website:$WEBSITE_HASH
kustomize edit set image gcr.io/datcom-ci/datacommons-mixer=gcr.io/datcom-ci/datacommons-mixer:$MIXER_HASH
kustomize build > $ENV.yaml
gcloud config set project $PROJECT_ID
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION
kubectl apply -f $ENV.yaml

# Deploy Cloud Endpoints
SERVICE_NAME="website-esp.endpoints.$PROJECT_ID.cloud.goog"
API_TITLE=$SERVICE_NAME
yq w --style=double $ROOT/gke/endpoints.yaml.tpl name $SERVICE_NAME > endpoints.yaml
yq w -i endpoints.yaml title "$API_TITLE"

# Deploy ESP configuration
gsutil cp gs://datcom-mixer-grpc/mixer-grpc/mixer-grpc.$MIXER_HASH.pb .
gcloud endpoints services deploy mixer-grpc.$MIXER_HASH.pb endpoints.yaml --project $PROJECT_ID
