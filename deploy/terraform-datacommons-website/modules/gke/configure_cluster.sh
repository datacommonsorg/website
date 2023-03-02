#!/bin/bash
# Copyright 2022 Google LLC
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
# Region is like "us-central1", zone is like "us-central1-a"
if [[ $LOCATION =~ ^[a-z]+-[a-z0-9]+$ ]]; then
  REGION=$LOCATION
else
  ZONE=$LOCATION
fi
gcloud container clusters get-credentials $CLUSTER_NAME \
  ${REGION:+--region $REGION} ${ZONE:+--zone $ZONE} --project=$PROJECT_ID

# Create namespace if it does not exist.
kubectl create namespace website \
  --dry-run=client -o yaml | kubectl apply -f -

# Create service account which is mapped to the GCP service account for Workload Identity
# if one does not exist.
kubectl create serviceaccount --namespace website website-ksa \
  --dry-run=client -o yaml | kubectl apply -f -

# Allow the Kubernetes service account to impersonate the Google service account
gcloud iam service-accounts add-iam-policy-binding \
  --project $PROJECT_ID \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:$PROJECT_ID.svc.id.goog[website/website-ksa]" \
  $WEB_ROBOT_SA_EMAIL

# Annotate service account.
kubectl annotate serviceaccount \
  --namespace website \
  --overwrite \
  website-ksa \
  iam.gke.io/gcp-service-account=$WEB_ROBOT_SA_EMAIL
