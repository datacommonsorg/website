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

# Provisions the GCP Secret Manager secret required by `website-narratives-app`.
#
# Usage:
#   ./setup_narratives.sh <ENV>
# Example:
#   ./setup_narratives.sh autopush

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

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
HMAC_SECRET_ID=$(yq eval '.narratives.transcriptHmacSecretName // "narratives-transcript-hmac-secret"' "$CONFIG_YAML")

# Create the transcript HMAC secret in GCP Secret Manager if it does not exist.
if ! gcloud secrets describe "$HMAC_SECRET_ID" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Creating Secret Manager secret ${HMAC_SECRET_ID} in ${PROJECT_ID}..."
  openssl rand -hex 32 | tr -d '\n' | gcloud secrets create "$HMAC_SECRET_ID" \
    --data-file=- \
    --replication-policy=automatic \
    --project="$PROJECT_ID"
else
  echo "Secret Manager secret ${HMAC_SECRET_ID} already exists in ${PROJECT_ID}."
fi

echo "Successfully verified Secret Manager secrets for ${ENV}."
