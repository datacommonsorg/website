#!/bin/bash
# Copyright 2023 Google LLC
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

function help {
  echo "Usage: $0 -eln"
  echo "-e       Instance environment as defined under ../deploy/helm_charts/envs"
  echo "-l       GKE region Default: us-central1"
  echo "-n       Setup nodejs service"
  exit 1
}

while getopts ":e:l:n?" OPTION; do
  case $OPTION in
    e)
      ENV=$OPTARG
      ;;
    l)
      LOCATION=$OPTARG
      ;;
    n)
      export SETUP_NODEJS=true
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

PROJECT_ID=$(yq eval '.project' ../deploy/helm_charts/envs/$ENV.yaml)
CLUSTER_PREFIX=$(yq eval '.cluster_prefix' ../deploy/helm_charts/envs/$ENV.yaml)

if [[ $LOCATION == "" ]]; then
  LOCATION="us-central1"
fi

# Get gke credentials
CLUSTER_NAME=$CLUSTER_PREFIX-$LOCATION
gcloud container clusters get-credentials $CLUSTER_NAME \
  --region=$LOCATION --project=$PROJECT_ID

# Update mci config
cp mci.yaml.tpl mci.yaml
export IP=$(gcloud compute addresses list --global --filter='name:dc-website-ip' --format='value(ADDRESS)')
yq eval -i '.metadata.annotations."networking.gke.io/static-ip" = env(IP)' mci.yaml
# If not setting up nodejs service, remove the nodejs path from the mci.yaml
if [[ -z $SETUP_NODEJS ]]; then
  yq eval -i 'del(.spec.template.spec.rules.[].http.paths[] | select(.backend.serviceName == "website-nodejs-mcs"))' mci.yaml
fi

# Apply configs
kubectl apply -f backendconfig.yaml
kubectl apply -f mci.yaml
kubectl apply -f website_mcs.yaml
# If setting up nodejs service, apply the mcs yaml definition for nodejs
if [[ $SETUP_NODEJS ]]; then
  kubectl apply -f website_nodejs_mcs.yaml
fi


# Check the status: `kubectl describe mci website -n website`