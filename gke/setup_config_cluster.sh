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

# https://cloud.google.com/kubernetes-engine/docs/how-to/ingress-for-anthos-setup

DEFAULT_VALUES_YAML="../deploy/helm_charts/dc_website/values.yaml"
CONFIG_YAML="../deploy/helm_charts/envs/$ENV.yaml"

PROJECT_ID=$(yq eval '.project' $CONFIG_YAML)
NARRATIVES_ENABLED=$(yq eval '.narratives.enabled // "false"' $CONFIG_YAML)
NARRATIVES_BASE_PATH=$(yq eval '.narratives.basePath // ""' $CONFIG_YAML)
if [[ -z $NARRATIVES_BASE_PATH ]]; then
  NARRATIVES_BASE_PATH=$(yq eval '.narratives.basePath' $DEFAULT_VALUES_YAML)
fi
NARRATIVES_BASE_PATH="${NARRATIVES_BASE_PATH%/}"
CLUSTER_NAME="website-$REGION"

gcloud config set project $PROJECT_ID
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION
gcloud beta container hub ingress enable \
  --config-membership=$CLUSTER_NAME

cp backendconfig.yaml.tpl backendconfig.yaml
cp mci.yaml.tpl mci.yaml
export IP=$(yq eval '.ip' $CONFIG_YAML)
yq eval -i '.metadata.annotations."networking.gke.io/static-ip" = env(IP)' mci.yaml
# Populate or remove the narratives paths and backendconfig based on narratives.enabled
if [[ $NARRATIVES_ENABLED == "true" ]]; then
  export NARRATIVES_BASE_PATH
  export NARRATIVES_WILDCARD_PATH="${NARRATIVES_BASE_PATH}/*"
  export NARRATIVES_HEALTH_PATH="${NARRATIVES_BASE_PATH}/healthz"
  yq eval -i '(select(.metadata.name == "backendconfig-narratives") | .spec.healthCheck.requestPath) = env(NARRATIVES_HEALTH_PATH)' backendconfig.yaml
  yq eval -i '(.spec.template.spec.rules.[].http.paths[] | select(.path == "<NARRATIVES_BASE_PATH>").path) = env(NARRATIVES_BASE_PATH)' mci.yaml
  yq eval -i '(.spec.template.spec.rules.[].http.paths[] | select(.path == "<NARRATIVES_BASE_PATH>/*").path) = env(NARRATIVES_WILDCARD_PATH)' mci.yaml
else
  yq eval -i 'select(.metadata.name != "backendconfig-narratives")' backendconfig.yaml
  yq eval -i 'del(.spec.template.spec.rules.[].http.paths[] | select(.backend.serviceName == "website-narratives-mcs"))' mci.yaml
fi

kubectl apply -f backendconfig.yaml
kubectl apply -f mci.yaml
kubectl apply -f website_mcs.yaml
# If narratives is enabled, apply the mcs yaml definition for narratives
if [[ $NARRATIVES_ENABLED == "true" ]]; then
  kubectl apply -f website_narratives_mcs.yaml
fi

# Check the status: `kubectl describe mci website -n website`