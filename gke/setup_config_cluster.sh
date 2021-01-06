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

PROJECT_ID=$(yq r config.yaml project)
REGION=$(yq r config.yaml region.primary)
CLUSTER_NAME="website-$REGION"

gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION
gcloud alpha container hub ingress enable \
  --config-membership=projects/$PROJECT_ID/locations/global/memberships/$CLUSTER_NAME

yq w mci.yaml.tpl \
  metadata.annotations.[networking.gke.io/static-ip] \
  $(yq r config.yaml ip) \
  > mci.yaml

kubectl apply -f mci.yaml
kubectl apply -f mcs.yaml

# Check the status: `kubectl describe mci website -n website`