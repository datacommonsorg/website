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

# Provisions the GCP APIs, IAM permissions, and Secret Manager secrets
# required by the `narratives` container in `website-agentic-apps`.
#
# Usage:
#   ./setup_narratives.sh <ENV>
# Example:
#   ./setup_narratives.sh autopush

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

if ! command -v yq >/dev/null 2>&1; then
  echo "Error: 'yq' (version 4.x) is required. See gke/README.md." >&2
  exit 1
fi

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: ./setup_narratives.sh <ENV>"
  exit 0
fi

ENV="${1:-}"

if [[ -z "$ENV" ]]; then
  echo "Missing arg 1 (env)." >&2
  echo "Usage: ./setup_narratives.sh <ENV>" >&2
  exit 1
fi

CONFIG_YAML="${DIR}/../deploy/helm_charts/envs/${ENV}.yaml"
if [[ ! -f "$CONFIG_YAML" ]]; then
  echo "Environment config not found: $CONFIG_YAML" >&2
  exit 1
fi

PROJECT_ID=$(yq eval '.project' "$CONFIG_YAML")
if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "null" ]]; then
  echo "Error: 'project' is missing or null in $CONFIG_YAML" >&2
  exit 1
fi
DC_API_KEY_SECRET=$(yq eval '.narratives.dcApiKeySecret // "mixer-api-key"' "$CONFIG_YAML")
HMAC_SECRET_ID=$(yq eval '.narratives.transcriptHmacSecretName // "narratives-transcript-hmac-secret"' "$CONFIG_YAML")
SERVICE_ACCOUNT="website-robot@${PROJECT_ID}.iam.gserviceaccount.com"

# 1. Enable Vertex AI API if not already enabled.
echo "Enabling aiplatform.googleapis.com in ${PROJECT_ID}..."
gcloud services enable aiplatform.googleapis.com --project="$PROJECT_ID"

# 2. Grant roles/aiplatform.user to the GKE workload identity robot account.
echo "Granting roles/aiplatform.user to ${SERVICE_ACCOUNT} in ${PROJECT_ID}..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/aiplatform.user" \
  --condition=None >/dev/null

# 3. Verify the Data Commons API key secret exists in GCP Secret Manager.
# Note: Unlike browser client keys created with `--allowed-referrers` in create_api_key.sh,
# the key stored in ${DC_API_KEY_SECRET} is used server-to-server by Python (no HTTP Referer header)
# and must not be restricted by HTTP referrer.
if ! gcloud secrets describe "$DC_API_KEY_SECRET" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Error: Secret Manager secret '${DC_API_KEY_SECRET}' not found in ${PROJECT_ID}." >&2
  echo "The Narratives server fetches '${DC_API_KEY_SECRET}' at startup and will fail to boot if it is missing." >&2
  echo "Please create '${DC_API_KEY_SECRET}' in ${PROJECT_ID} with a Data Commons API key that does NOT have HTTP referrer restrictions (Narratives calls the MCP server directly from Python without a Referer header)." >&2
  exit 1
else
  echo "Verified Secret Manager secret ${DC_API_KEY_SECRET} exists in ${PROJECT_ID}."
  echo "Note: Ensure the API key in ${DC_API_KEY_SECRET} does not have HTTP referrer restrictions, as Narratives calls the MCP server directly from Python without a Referer header."
fi

# 4. Create the transcript HMAC secret in GCP Secret Manager if it does not exist.
if ! gcloud secrets describe "$HMAC_SECRET_ID" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Creating Secret Manager secret ${HMAC_SECRET_ID} in ${PROJECT_ID}..."
  openssl rand -hex 32 | tr -d '\n' | gcloud secrets create "$HMAC_SECRET_ID" \
    --data-file=- \
    --replication-policy=automatic \
    --project="$PROJECT_ID"
else
  echo "Secret Manager secret ${HMAC_SECRET_ID} already exists in ${PROJECT_ID}."
fi

echo "Successfully configured Narratives prerequisites for ${ENV}."
