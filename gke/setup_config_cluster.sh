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

function help {
  echo "Usage: $0 -n"
  echo "-n       Setup nodejs service"
  exit 1
}

while getopts ":n?" OPTION; do
  case $OPTION in
    n)
      export SETUP_NODEJS=true
      ;;
    *)
      help
      ;;
  esac
done

# https://cloud.google.com/kubernetes-engine/docs/how-to/ingress-for-anthos-setup

CONFIG_YAML="../deploy/helm_charts/envs/$ENV.yaml"

PROJECT_ID=$(yq eval '.project' $CONFIG_YAML)
CLUSTER_NAME="website-$REGION"

gcloud config set project $PROJECT_ID
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION
gcloud beta container hub ingress enable \
  --config-membership=$CLUSTER_NAME

cp mci.yaml.tpl mci.yaml
export IP=$(yq eval '.ip' $CONFIG_YAML)
yq eval -i '.metadata.annotations."networking.gke.io/static-ip" = env(IP)' mci.yaml
# If not setting up nodejs service, remove the nodejs path from the mci.yaml
if [[ -z $SETUP_NODEJS ]]; then
  yq eval -i 'del(.spec.template.spec.rules.[].http.paths[] | select(.backend.serviceName == "website-nodejs-mcs"))' mci.yaml
fi

kubectl apply -f backendconfig.yaml
kubectl apply -f mci.yaml
kubectl apply -f website_mcs.yaml
# If setting up nodejs service, apply the mcs yaml definition for nodejs
if [[ $SETUP_NODEJS ]]; then
  kubectl apply -f website_nodejs_mcs.yaml
fi

# Check the status: `kubectl describe mci website -n website`