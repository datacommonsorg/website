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

ENV=$1
REGION=$2
NODES=$3

PROJECT_ID=$(yq r ../config.yaml project.$ENV)

../generate_yaml.sh $ENV

./download_robot_key.sh $PROJECT_ID

gcloud config set project $PROJECT_ID

CLUSTER_NAME="website-$REGION"
gcloud container clusters create $CLUSTER_NAME \
  --num-nodes=$NODES \
  --region=$REGION \
  --machine-type=e2-highmem-4 \
  --enable-ip-alias # VPC native-cluster to enable Ingress for Anthos

# Register cluster using Workload Identity ([Documentation](https://cloud.google.com/anthos/multicluster-management/connect/registering-a-cluster#register_cluster))
gcloud beta container hub memberships register $CLUSTER_NAME \
  --gke-uri=https://container.googleapis.com/v1/projects/$PROJECT_ID/locations/$REGION/clusters/$CLUSTER_NAME \
  --enable-workload-identity

# IAM for gke connect
gcloud projects add-iam-policy-binding \
  $PROJECT_ID \
  --member "serviceAccount:$PROJECT_ID.hub.id.goog[gke-connect/connect-agent-sa]" \
  --role "roles/gkehub.connect"

gcloud container clusters get-credentials $CLUSTER_NAME --region=$REGION

# Create namespace
kubectl create namespace website
# Website robot account
kubectl create secret generic website-robot-key --from-file=website-robot-key.json --namespace=website
# Mixer robot account
kubectl create secret generic mixer-robot-key --from-file=mixer-robot-key.json --namespace=website
# Mixer deployment
kubectl apply -f deployment.yaml