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

gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION

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
