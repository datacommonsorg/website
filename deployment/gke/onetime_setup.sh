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

function create_cluster() {
  PROJECT_ID=$1
  REGION=$2
  CLUSTER_NAME="website-$REGION"
  gcloud container clusters create $CLUSTER_NAME \
    --num-nodes=3 \
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

  # Create namespace
  kubectl create namespace website
  # Website robot account
  kubectl create secret generic website-robot-key --from-file=website-robot-key.json --namespace=website
  # Mixer robot account
  kubectl create secret generic mixer-robot-key --from-file=mixer-robot-key.json --namespace=website
}

function setup_config_cluster() {
  PROJECT_ID=$1
  REGION=$2
  ENV=$3
  CLUSTER_NAME="website-$REGION"
  gcloud container clusters get-credentials $CLUSTER_NAME
  gcloud alpha container hub ingress enable \
    --config-membership=projects/$PROJECT_ID/locations/global/memberships/$CLUSTER_NAME

  yq w mci.yaml.tmpl \
    metadata.annotations.'networking.gke.io/static-ip' \
    $(yq r cluster.yaml ip.$ENV) \
    > mci.yaml
  kubectl apply -f mci.yaml
  kubectl apply -f mcs.yaml
}

# This is crucial to make the ingress external IP working.
function setup_ssl() {
  gcloud compute ssl-certificates create website-certificate \
    --domains=$(yq r cluster.yaml domain.$1) --global
}


# Valid argument would be: "staging", "prod"
env=$1
if [[ $env != "staging" ]] && [[ $env != "prod" ]]; then
    echo "Invalid environment: $env"
    exit
fi

# Dev project
PROJECT_ID=$(yq r ../config.yaml project.dev)

# Update gcloud
gcloud components update

# Auth
gcloud auth login
gcloud config set project $PROJECT_ID

gcloud services enable \
  anthos.googleapis.com \
  multiclusteringress.googleapis.com \
  container.googleapis.com \
  gkeconnect.googleapis.com \
  gkehub.googleapis.com \
  cloudresourcemanager.googleapis.com

# Get the robot account key
gcloud iam service-accounts keys create website-robot-key.json \
      --iam-account mixer-robot@$GCP_PROJECT.iam.gserviceaccount.com
# Use the same robot account for website and mixer
cp website-robot-key.json mixer-robot-key.json

# Create certificate
setup_ssl $env

# Setup cluster in primary region
PRIMARY_REGION=($(yq r cluster.yaml region.$env.primary))
create_cluster $PROJECT_ID $PRIMARY_REGION

# Setup cluster in other regions
len=$(yq r cluster.yaml --length region.$env.others)
for index in {0..(($len-1))};
do
  REGION=$(yq r cluster.yaml region.$env.others[$index])
  create_cluster $PROJECT_ID $REGION
done

setup_config_cluster $PROJECT_ID $PRIMARY_REGION $env