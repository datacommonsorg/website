#!/bin/bash
# Copyright 2026 Google LLC
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

# Provisions the GCP Secret Manager secret and GKE Kubernetes Secret
# (`narratives-secrets`) required by `website-narratives-app`.
#
# Usage:
#   ./setup_narratives.sh <ENV> <REGION>
# Example:
#   ./setup_narratives.sh autopush us-central1

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: ./setup_narratives.sh <ENV> <REGION>"
  exit 0
fi

ENV="${1:-}"
REGION="${2:-}"

if [[ -z "$ENV" || -z "$REGION" ]]; then
  echo "Missing arg 1 (env) and/or arg 2 (region)." >&2
  echo "Usage: ./setup_narratives.sh <ENV> <REGION>" >&2
  exit 1
fi

CONFIG_YAML="${DIR}/../deploy/helm_charts/envs/${ENV}.yaml"
if [[ ! -f "$CONFIG_YAML" ]]; then
  echo "Environment config not found: $CONFIG_YAML" >&2
  exit 1
fi

PROJECT_ID=$(yq eval '.project' "$CONFIG_YAML")
NAMESPACE=$(yq eval '.namespace.name // "website"' "$CONFIG_YAML")
SECRET_NAME=$(yq eval '.narratives.secretName // "narratives-secrets"' "$CONFIG_YAML")
CLUSTER_NAME="website-${REGION}"
HMAC_SECRET_ID="narratives-transcript-hmac-secret"

# 1. Create the transcript HMAC secret in GCP Secret Manager if it does not exist.
if ! gcloud secrets describe "$HMAC_SECRET_ID" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Creating Secret Manager secret ${HMAC_SECRET_ID} in ${PROJECT_ID}..."
  openssl rand -hex 32 | tr -d '\n' | gcloud secrets create "$HMAC_SECRET_ID" \
    --data-file=- \
    --replication-policy=automatic \
    --project="$PROJECT_ID"
else
  echo "Secret Manager secret ${HMAC_SECRET_ID} already exists in ${PROJECT_ID}."
fi

# 2. Sync `dc-api-key` and `transcript-hmac-secret` into the GKE cluster Secret.
echo "Fetching credentials for cluster ${CLUSTER_NAME} (${REGION}) in ${PROJECT_ID}..."
gcloud container clusters get-credentials "$CLUSTER_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID"

DC_API_KEY="$(gcloud secrets versions access latest --secret=mixer-api-key --project="$PROJECT_ID")"
TRANSCRIPT_HMAC_SECRET="$(gcloud secrets versions access latest --secret="$HMAC_SECRET_ID" --project="$PROJECT_ID")"

echo "Applying Kubernetes Secret ${SECRET_NAME} in namespace ${NAMESPACE}..."
kubectl create secret generic "$SECRET_NAME" \
  --namespace="$NAMESPACE" \
  --from-literal=dc-api-key="$DC_API_KEY" \
  --from-literal=transcript-hmac-secret="$TRANSCRIPT_HMAC_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Successfully configured Narratives secrets for ${ENV} (${CLUSTER_NAME})."
