#!/bin/bash
# Copyright 2023 Google LLC
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
# !!! WARNING: Run this script in a clean HEAD on master.
#

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$(dirname "$DIR")"

function help {
  echo "Usage: $0 -el"
  echo "-e       Instance environment as defined under /deploy/gke"
  echo "-l       GKE location(zone or region) Default: us-central1"
  exit 1
}

while getopts ":e:l:" OPTION; do
  case $OPTION in
    e)
      ENV=$OPTARG
      ;;
    l)
      LOCATION=$OPTARG
      ;;
    *)
      help
      ;;
  esac
done

if [[ $ENV == "" ]]; then
  echo "Set environment by -e"
  exit 1
fi

PROJECT_ID=$(yq eval '.project' $ROOT/deploy/helm_charts/envs/$ENV.yaml)
CLUSTER_PREFIX=$(yq eval '.cluster_prefix' $ROOT/deploy/helm_charts/envs/$ENV.yaml)
ESP_SERVICE_NAME="website-esp.endpoints.$PROJECT_ID.cloud.goog"

if [[ $LOCATION == "" ]]; then
  LOCATION="us-central1"
fi

WEBSITE_HASH=$(yq eval '.website.image.tag' $ROOT/deploy/helm_charts/envs/$ENV.yaml)
if [[ $WEBSITE_HASH == "" || $WEBSITE_HASH == "null" ]]; then
  cd $ROOT
  WEBSITE_HASH=$(git rev-parse --short=7 HEAD)
fi

cd $ROOT/mixer
MIXER_HASH=$(git rev-parse --short=7 HEAD)

# Get gke credentials
function get_gke_credentials() {
  if [[ $LOCATION =~ ^[a-z]+-[a-z0-9]+$ ]]; then
    REGION=$LOCATION
  else
    ZONE=$LOCATION
  fi
  CLUSTER_NAME=$CLUSTER_PREFIX-$LOCATION
  gcloud container clusters get-credentials $CLUSTER_NAME \
    ${REGION:+--region=$REGION} ${ZONE:+--zone=$ZONE} --project=$PROJECT_ID
}

# Release Mixer helm chart
# Note that the config yaml($ENV.yaml) is coming from the website repo, not Mixer.
function deploy_mixer() {
  cd $ROOT
  helm upgrade --install dc-mixer mixer/deploy/helm_charts/mixer \
  --atomic \
  --debug \
  --timeout 10m \
  --force  \
  -f "deploy/helm_charts/envs/$ENV.yaml" \
  --set ingress.enabled="false" \
  --set mixer.image.tag="$MIXER_HASH" \
  --set mixer.githash="$MIXER_HASH" \
  --set mixer.serviceName="$ESP_SERVICE_NAME" \
  --set mixer.hostProject="$PROJECT_ID" \
  --set-file mixer.schemaConfigs."base\.mcf"=mixer/deploy/mapping/base.mcf \
  --set-file mixer.schemaConfigs."encode\.mcf"=mixer/deploy/mapping/encode.mcf \
  --set-file kgStoreConfig.bigqueryVersion=mixer/deploy/storage/bigquery.version \
  --set-file kgStoreConfig.baseBigtableInfo=mixer/deploy/storage/base_bigtable_info.yaml
}

# Deploy Cloud Endpoints
function deploy_cloud_esp() {
  export SERVICE_NAME=$ESP_SERVICE_NAME
  export API_TITLE=$SERVICE_NAME
  cp $ROOT/gke/endpoints.yaml.tpl endpoints.yaml
  yq eval -i '.name = env(SERVICE_NAME)' endpoints.yaml
  yq eval -i '.title = env(API_TITLE)' endpoints.yaml

  # Deploy ESP configuration
  gsutil cp gs://datcom-mixer-grpc/mixer-grpc/mixer-grpc.$MIXER_HASH.pb .
  gcloud endpoints services deploy mixer-grpc.$MIXER_HASH.pb endpoints.yaml --project $PROJECT_ID
}
# Release website helm chart
function deploy_website() {
  helm upgrade --install dc-website deploy/helm_charts/dc_website \
  -f "deploy/helm_charts/envs/$ENV.yaml" \
  --atomic \
  --debug \
  --timeout 10m \
  --set website.image.tag="$WEBSITE_HASH" \
  --set website.githash="$WEBSITE_HASH" \
  --set-file nl.embeddings=deploy/base/model.yaml
}

cd $ROOT
get_gke_credentials
deploy_mixer
deploy_website
deploy_cloud_esp
