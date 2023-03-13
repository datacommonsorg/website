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

if [[ $ENV == "" || $REGION == "" ]]; then
  echo "Missing arg 1 (env) and/or arg 2 (region)"
  exit 1
fi

PROJECT_ID=$(yq eval '.project' ../deploy/gke/$ENV.yaml)
NODES=$(yq eval '.nodes' ../deploy/gke/$ENV.yaml)

CLUSTER_NAME="website-$REGION"

gcloud config set project $PROJECT_ID

# VPC native-cluster to enable Ingress for Anthos
gcloud container clusters create $CLUSTER_NAME \
  --num-nodes=$NODES \
  --region=$REGION \
  --machine-type=e2-highmem-4 \
  --enable-ip-alias \
  --workload-pool=$PROJECT_ID.svc.id.goog \
  --scopes=https://www.googleapis.com/auth/trace.append

gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION

# Register cluster using Workload Identity ([Documentation](https://cloud.google.com/kubernetes-engine/docs/how-to/multi-cluster-ingress-setup#fleet-registration))
gcloud container hub memberships register $CLUSTER_NAME \
    --gke-cluster $REGION/$CLUSTER_NAME \
    --enable-workload-identity \
    --project=$PROJECT_ID

# IAM for gke connect
gcloud projects add-iam-policy-binding \
  $PROJECT_ID \
  --member "serviceAccount:$PROJECT_ID.hub.id.goog[gke-connect/connect-agent-sa]" \
  --role "roles/gkehub.connect"

# Create namespace
kubectl create namespace website

# Create service account which is mapped to the GCP service account for Workload Identity.
kubectl create serviceaccount --namespace website website-ksa

# Allow the Kubernetes service account to impersonate the Google service account
gcloud iam service-accounts add-iam-policy-binding \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:$PROJECT_ID.svc.id.goog[website/website-ksa]" \
  website-robot@$PROJECT_ID.iam.gserviceaccount.com

# Annotate service account
kubectl annotate serviceaccount \
  --namespace website \
  website-ksa \
  iam.gke.io/gcp-service-account=website-robot@$PROJECT_ID.iam.gserviceaccount.com