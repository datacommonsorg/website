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
  echo "-e       Instance environment as defined under /deploy/helm_charts/envs"
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
  CONFIG_ID=$(gcloud endpoints services deploy mixer-grpc.$MIXER_HASH.pb endpoints.yaml --project $PROJECT_ID 2>&1 | awk -F'[][]' '/Service Configuration/ {print $2}')

  # Mount the service config for the container
  # https://cloud.google.com/endpoints/docs/grpc/get-started-kubernetes-engine-espv2#deploying_the_sample_api_and_esp_to_the_cluster
  curl -o "/tmp/service_config.json" -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    "https://servicemanagement.googleapis.com/v1/services/$SERVICE_NAME/configs/$CONFIG_ID?view=FULL"
  kubectl delete configmap service-config-configmap -n website --ignore-not-found
  kubectl create configmap service-config-configmap -n website \
    --from-file=service_config.json=/tmp/service_config.json
}
# Release website helm chart
function deploy_website() {
  WEBSITE_SERVICE_URL=""
  NODEJS_SERVICE_URL=""
  # Find the service name for website-app
  for service in `kubectl get services -n website -o name`
  do
    app=`kubectl get $service -n website --output=jsonpath="{.spec.selector.app}"`
    if [[ $app == "website-app" ]]; then
      WEBSITE_SERVICE_URL="http://${service#"service/"}:8080"
    elif [[ $app == "website-nodejs-app" ]]; then
      NODEJS_SERVICE_URL="http://${service#"service/"}:8080"
    fi
  done
  helm upgrade --install dc-website deploy/helm_charts/dc_website \
  -f "deploy/helm_charts/envs/$ENV.yaml" \
  --atomic \
  --timeout 15m \
  --set website.image.tag="$WEBSITE_HASH" \
  --set website.githash="$WEBSITE_HASH" \
  --set nodejs.apiRoot="$WEBSITE_SERVICE_URL" \
  --set cronTesting.webApiRoot="$WEBSITE_SERVICE_URL" \
  --set cronTesting.nodejsApiRoot="$NODEJS_SERVICE_URL" \
  --set-file nl.catalog=deploy/nl/catalog.yaml \
  --set-file website.placeSummary.data.country=server/config/summaries/place_summaries_for_country_.json \
  --set-file website.placeSummary.data.geoid_0_2=server/config/summaries/place_summaries_for_geoId_0-2.json \
  --set-file website.placeSummary.data.geoid_3_5=server/config/summaries/place_summaries_for_geoId_3-5.json \
  --set-file website.placeSummary.data.geoid_6_9=server/config/summaries/place_summaries_for_geoId_6-9.json \
  --set-file website.placeSummary.data.wikidataid=server/config/summaries/place_summaries_for_wikidataId_.json \
  --set-file website.placeSummary.data.others=server/config/summaries/place_summaries_others.json
}

cd $ROOT
get_gke_credentials
deploy_cloud_esp
deploy_mixer
deploy_website
