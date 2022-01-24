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

# https://cloud.google.com/kubernetes-engine/docs/how-to/ingress-for-anthos-setup

PROJECT_ID=$(yq eval '.project' config.yaml)
REGION=$(yq eval '.region.primary' config.yaml)
CLUSTER_NAME="website-$REGION"

gcloud config set project $PROJECT_ID
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION
gcloud beta container hub ingress enable \
  --config-membership=$CLUSTER_NAME

cp mci.yaml.tpl mci.yaml
export IP=$(yq eval '.ip' config.yaml)
yq eval -i '.metadata.annotations."networking.gke.io/static-ip" = env(IP)' mci.yaml

kubectl apply -f backendconfig.yaml
kubectl apply -f mci.yaml
kubectl apply -f mcs.yaml

# Check the status: `kubectl describe mci website -n website`