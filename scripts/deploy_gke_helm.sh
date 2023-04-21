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

function help {
  echo "Usage: $0 -elphti"
  echo "-e       Instance environment as defined under /deploy/gke"
  echo "-l       GKE location(zone or region) Default: us-central1"
  echo "-p       GCP project to deploy the project to, when specified, docker image is also read from this project"
  echo "-h       Website hash used for deployment"
  echo "-t       Comma separated list of custom BigTable names."
  echo "-i       GCP project id where the website/nl images are stored."
  exit 1
}

PROJECT_ID=""
ENV=""

while getopts ":e:l:p:h:t:i:" OPTION; do
  case $OPTION in
    e)
      ENV=$OPTARG
      ;;
    l)
      LOCATION=$OPTARG
      ;;
    p)
      PROJECT_ID=$OPTARG
      ENV=custom
      ;;
    h)
      WEBSITE_HASH=$OPTARG
      ;;
    t)
      CUSTOM_BT_CSV=$OPTARG
      ;;
    i)
      IMAGE_PROJECT=$OPTARG
      ;;
    *)
      help
      ;;
  esac
done

if [[ $ENV == "" && $PROJECT_ID == "" ]];then
  echo "Set environment by -e, or set project id by -p"
  exit 1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$(dirname "$DIR")"

if [[ $LOCATION == "" ]]; then
  LOCATION="us-central1"
fi

if [[ $IMAGE_PROJECT == "" ]]; then
  IMAGE_PROJECT="datcom-ci"
fi


cd $ROOT
if [[ $WEBSITE_HASH == "" ]]; then
  WEBSITE_HASH=$(git rev-parse --short=7 HEAD)
fi

cd $ROOT/mixer
MIXER_HASH=$(git rev-parse --short=7 HEAD)

function create_custom_bigtable_info_yaml() {
  cd $ROOT/mixer
  export PROJECT_ID=$PROJECT_ID
  yq eval -i '.instance = "dc-graph"' deploy/storage/custom_bigtable_info.yaml
  yq eval -i '.project = env(PROJECT_ID)' deploy/storage/custom_bigtable_info.yaml
  yq eval -i 'del(.tables)' deploy/storage/custom_bigtable_info.yaml
  yq eval -i '.tables = []' deploy/storage/custom_bigtable_info.yaml
  IFS=","
  for TABLE in $CUSTOM_BT_CSV
  do
    echo "Adding custom BigTable: $TABLE"
    export TABLE=$TABLE
    yq eval -i '.tables += [ env(TABLE) ]' deploy/storage/custom_bigtable_info.yaml
  done
}

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
  --set-file kgStoreConfig.baseBigtableInfo=mixer/deploy/storage/base_bigtable_info.yaml \
  --set-file kgStoreConfig.customBigtableInfo=mixer/deploy/storage/custom_bigtable_info.yaml
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
  --set ingress.enabled=$ENABLE_INGRESS \
  --set website.image.project="$IMAGE_PROJECT" \
  --set website.image.tag="$WEBSITE_HASH" \
  --set website.githash="$WEBSITE_HASH" \
  --set mixer.githash="$MIXER_HASH" \
  --set-file kgStoreConfig.bigqueryVersion=mixer/deploy/storage/bigquery.version
}

cd $ROOT
if [[ $PROJECT_ID != "" ]]; then
  ENABLE_INGRESS="true"
  # This is a pure custom project hosted and deployed by third party
  CLUSTER_PREFIX=datacommons
  create_custom_bigtable_info_yaml
else
  touch mixer/deploy/storage/custom_bigtable_info.yaml
  ENABLE_INGRESS="false"
  PROJECT_ID=$(yq eval '.project' $ROOT/deploy/helm_charts/envs/$ENV.yaml)
  CLUSTER_PREFIX=$(yq eval '.cluster_prefix' $ROOT/deploy/helm_charts/envs/$ENV.yaml)
fi
ESP_SERVICE_NAME="website-esp.endpoints.$PROJECT_ID.cloud.goog"

cd $ROOT
get_gke_credentials
deploy_mixer
deploy_website
deploy_cloud_esp
