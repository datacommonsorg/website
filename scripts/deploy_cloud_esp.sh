#!/bin/bash
# Copyright 2025 Google LLC
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

# Script to deploy Cloud Endpoints configuration for the mixer.
# This is intended to be called from a Skaffold customAction.

set -e

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <ENV> <DEPLOYMENT> <MIXER_HASH>"
  exit 1
fi

ENV=$1
DEPLOYMENT=$2 # Whether it's for mixer or website
MIXER_HASH=$3
echo "Deploying Cloud Endpoints for environment: $ENV with mixer hash: $MIXER_HASH"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$(dirname "$DIR")"
cd $ROOT

# These variables are sourced from the helm values file.
if [[ "$DEPLOYMENT" == "mixer" ]]; then
  HELM_VALUES_FILE="$ROOT/mixer/deploy/helm_charts/envs/mixer_$ENV.yaml"
  ENDPOINTS_TEMPLATE_FILE="$ROOT/mixer/esp/endpoints.yaml.tmpl"

elif [[ "$DEPLOYMENT" == "website" ]]; then
  HELM_VALUES_FILE="$ROOT/deploy/helm_charts/envs/$ENV.yaml"
  ENDPOINTS_TEMPLATE_FILE="$ROOT/gke/endpoints.yaml.tpl"
fi

if [ ! -f "$HELM_VALUES_FILE" ]; then
    echo "Could not find helm values file for environment $ENV"
    exit 1
fi

PROJECT_ID=$(yq eval '.project' $HELM_VALUES_FILE)
if [[ $PROJECT_ID == "null" ]]; then
    # Fallback for website env files that don't have project defined at the top level
    PROJECT_ID=$(yq eval '.mixer.hostProject' $HELM_VALUES_FILE)
fi
if [[ $PROJECT_ID == "null" ]]; then
    echo "Could not determine PROJECT_ID from $HELM_VALUES_FILE"
    exit 1
fi

CLUSTER_PREFIX=$(yq eval '.cluster_prefix' $HELM_VALUES_FILE)
LOCATION="us-central1"
CLUSTER_NAME=$CLUSTER_PREFIX-$LOCATION

# Get gke credentials
echo "Getting GKE credentials for $CLUSTER_NAME in $LOCATION..."
gcloud container clusters get-credentials $CLUSTER_NAME --region=$LOCATION --project=$PROJECT_ID

ESP_SERVICE_NAME=$(yq eval '.mixer.serviceName' $HELM_VALUES_FILE)
if [[ $ESP_SERVICE_NAME == "null" ]]; then
    echo "Could not determine ESP_SERVICE_NAME from $HELM_VALUES_FILE"
    exit 1
fi

echo "Project ID: $PROJECT_ID"
echo "ESP Service Name: $ESP_SERVICE_NAME"
echo "Mixer Hash: $MIXER_HASH"

# Deploy Cloud Endpoints
export SERVICE_NAME=$ESP_SERVICE_NAME
export API_TITLE=$SERVICE_NAME
cp "$ENDPOINTS_TEMPLATE_FILE" endpoints.yaml
yq eval -i '.name = env(SERVICE_NAME)' endpoints.yaml
yq eval -i '.title = env(API_TITLE)' endpoints.yaml
if [[ "$DEPLOYMENT" == "mixer" ]]; then
  export IP=$(yq eval '.ip' $HELM_VALUES_FILE)
  yq eval -i '.endpoints[0].target = env(IP)' endpoints.yaml
  yq eval -i '.endpoints[0].name = env(SERVICE_NAME)' endpoints.yaml

  # Check for V2Resolve override
  # TODO(/v2/resolve cleanup): Delete once /v2/resolve always requires an api key.
  V2_RESOLVE_ALLOW_UNREGISTERED=$(yq eval '.esp.v2_resolve_allow_unregistered' $HELM_VALUES_FILE)
  if [[ "$V2_RESOLVE_ALLOW_UNREGISTERED" == "false" ]]; then
    echo "Overriding allow_unregistered_calls to false for datacommons.Mixer.V2Resolve"
    yq eval -i '(.usage.rules[] | select(.selector == "datacommons.Mixer.V2Resolve").allow_unregistered_calls) = false' endpoints.yaml
  fi

  echo "endpoints.yaml content:"
  cat endpoints.yaml
fi

# Deploy ESP configuration
echo "Downloading mixer-grpc.$MIXER_HASH.pb..."
gsutil cp gs://datcom-mixer-grpc/mixer-grpc/mixer-grpc.$MIXER_HASH.pb .

echo "Deploying service configuration..."
GCLOUD_OUTPUT=$(gcloud endpoints services deploy mixer-grpc.$MIXER_HASH.pb endpoints.yaml --project $PROJECT_ID 2>&1)
echo "gcloud output: $GCLOUD_OUTPUT"
CONFIG_ID=$(echo "$GCLOUD_OUTPUT" | awk -F'[][]' '/Service Configuration/ {print $2}')

if [[ -z "$CONFIG_ID" ]]; then
    echo "Failed to deploy endpoint and get CONFIG_ID"
    exit 1
fi
echo "Deployed service configuration with ID: $CONFIG_ID"

# Mount the service config for the container
echo "Downloading full service config..."
curl -o "/tmp/service_config.json" -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://servicemanagement.googleapis.com/v1/services/$SERVICE_NAME/configs/$CONFIG_ID?view=FULL"

echo "Creating/Updating service-config-configmap..."
kubectl delete configmap service-config-configmap -n $DEPLOYMENT --ignore-not-found
kubectl create configmap service-config-configmap -n $DEPLOYMENT \
  --from-file=service_config.json=/tmp/service_config.json

echo "Cloud Endpoints deployment complete."
