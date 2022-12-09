#!/bin/bash

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
