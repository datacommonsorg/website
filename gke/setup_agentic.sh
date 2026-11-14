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

# Provisions the GCP APIs, IAM permissions, Secret Manager secrets, Model
# Armor template, and GCS configuration bucket required by agentic app
# containers (e.g. `discover`) in `website-agentic-apps`.
#
# Usage:
#   ./setup_agentic.sh <ENV> [--bucket-location <LOCATION>]
# Example:
#   ./setup_agentic.sh autopush
#   ./setup_agentic.sh prod --bucket-location us

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
DEFAULT_BUCKET_LOCATION="us-central1"

usage() {
  echo "Usage: ./setup_agentic.sh <ENV> [--bucket-location <LOCATION>]"
  echo "  <ENV>                         Environment name under deploy/helm_charts/envs/ (e.g. autopush, prod)"
  echo "  --bucket-location <LOCATION>  GCS location when creating a new config bucket (default: ${DEFAULT_BUCKET_LOCATION}; use 'us' for multi-region prod)"
}

if ! command -v yq >/dev/null 2>&1; then
  echo "Error: 'yq' (version 4.x) is required. See gke/README.md." >&2
  exit 1
fi

ENV=""
CONFIG_BUCKET_LOCATION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --bucket-location)
      if [[ $# -lt 2 || -z "${2:-}" || "${2:-}" == -* ]]; then
        echo "Error: '--bucket-location' requires a non-empty location argument (e.g. 'us-central1' or 'us')." >&2
        usage >&2
        exit 1
      fi
      CONFIG_BUCKET_LOCATION="$2"
      shift 2
      ;;
    --bucket-location=*)
      CONFIG_BUCKET_LOCATION="${1#*=}"
      if [[ -z "$CONFIG_BUCKET_LOCATION" ]]; then
        echo "Error: '--bucket-location' requires a non-empty location argument (e.g. 'us-central1' or 'us')." >&2
        usage >&2
        exit 1
      fi
      shift
      ;;
    -*)
      echo "Error: Unknown option '$1'." >&2
      usage >&2
      exit 1
      ;;
    *)
      if [[ -n "$ENV" ]]; then
        echo "Error: Unexpected extra argument '$1'." >&2
        usage >&2
        exit 1
      fi
      ENV="$1"
      shift
      ;;
  esac
done

if [[ -z "$ENV" ]]; then
  echo "Missing required <ENV> argument." >&2
  usage >&2
  exit 1
fi

VALUES_YAML="${DIR}/../deploy/helm_charts/dc_website/values.yaml"
if [[ ! -f "$VALUES_YAML" ]]; then
  echo "Default values config not found: $VALUES_YAML" >&2
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
DC_API_KEY_SECRET=$(yq eval '.agentic.dcApiKeySecret // ""' "$CONFIG_YAML")
if [[ -z "$DC_API_KEY_SECRET" || "$DC_API_KEY_SECRET" == "null" ]]; then
  DC_API_KEY_SECRET=$(yq eval '.agentic.dcApiKeySecret // "mixer-api-key"' "$VALUES_YAML")
fi
HMAC_SECRET_ID=$(yq eval '.agentic.transcriptHmacSecretName // ""' "$CONFIG_YAML")
if [[ -z "$HMAC_SECRET_ID" || "$HMAC_SECRET_ID" == "null" ]]; then
  HMAC_SECRET_ID=$(yq eval '.agentic.transcriptHmacSecretName // "agentic-transcript-hmac-secret"' "$VALUES_YAML")
fi
MODEL_ARMOR_LOCATION=$(yq eval '.agentic.modelArmorLocation // ""' "$CONFIG_YAML")
if [[ -z "$MODEL_ARMOR_LOCATION" || "$MODEL_ARMOR_LOCATION" == "null" ]]; then
  MODEL_ARMOR_LOCATION=$(yq eval '.agentic.modelArmorLocation // ""' "$VALUES_YAML")
fi
if [[ -z "$MODEL_ARMOR_LOCATION" || "$MODEL_ARMOR_LOCATION" == "null" ]]; then
  echo "Error: 'agentic.modelArmorLocation' is missing or empty in $CONFIG_YAML and $VALUES_YAML" >&2
  exit 1
fi
MODEL_ARMOR_TEMPLATE_ID=$(yq eval '.agentic.discover.modelArmorTemplateId // ""' "$CONFIG_YAML")
if [[ -z "$MODEL_ARMOR_TEMPLATE_ID" || "$MODEL_ARMOR_TEMPLATE_ID" == "null" ]]; then
  MODEL_ARMOR_TEMPLATE_ID=$(yq eval '.agentic.discover.modelArmorTemplateId // ""' "$VALUES_YAML")
fi
if [[ "$MODEL_ARMOR_TEMPLATE_ID" == *"/"* ]]; then
  echo "Error: 'agentic.discover.modelArmorTemplateId' in ${CONFIG_YAML} must be a template ID (e.g. 'discover-${ENV}'), not a full resource path." >&2
  exit 1
fi
CONFIG_BUCKET=$(yq eval '.agentic.discover.configBucket // ""' "$CONFIG_YAML")
if [[ "$CONFIG_BUCKET" == *"/"* ]]; then
  echo "Error: 'agentic.discover.configBucket' in ${CONFIG_YAML} must be a bucket name (e.g. '${PROJECT_ID}-discover-config'), not a gs:// URI or path." >&2
  exit 1
fi
DEFAULT_DISCOVER_AGENT_CONFIG="${DIR}/discover_agent_config.seed.json"
# Object name must match CONFIG_URL in deploy/helm_charts/dc_website/templates/deployment.yaml.
DISCOVER_CONFIG_OBJECT="agent-config.json"
SERVICE_ACCOUNT="website-robot@${PROJECT_ID}.iam.gserviceaccount.com"

# 1. Enable Vertex AI, Model Armor, Sensitive Data Protection, and Cloud Storage APIs if not already enabled.
echo "Enabling aiplatform.googleapis.com, modelarmor.googleapis.com, dlp.googleapis.com, and storage.googleapis.com in ${PROJECT_ID}..."
gcloud services enable \
  aiplatform.googleapis.com \
  modelarmor.googleapis.com \
  dlp.googleapis.com \
  storage.googleapis.com \
  --project="$PROJECT_ID"

# 2. Grant roles/aiplatform.user and roles/modelarmor.user to the GKE workload identity robot account.
echo "Granting roles/aiplatform.user and roles/modelarmor.user to ${SERVICE_ACCOUNT} in ${PROJECT_ID}..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/aiplatform.user" \
  --condition=None >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/modelarmor.user" \
  --condition=None >/dev/null

# 3. Verify the Data Commons API key secret exists in GCP Secret Manager.
# Note: Unlike browser client keys created with `--allowed-referrers` in create_api_key.sh,
# the key stored in ${DC_API_KEY_SECRET} is used server-to-server by Python (no HTTP Referer header)
# and must not be restricted by HTTP referrer.
if ! gcloud secrets describe "$DC_API_KEY_SECRET" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Error: Secret Manager secret '${DC_API_KEY_SECRET}' not found in ${PROJECT_ID}." >&2
  echo "The agentic app server fetches '${DC_API_KEY_SECRET}' at startup and will fail to boot if it is missing." >&2
  echo "Please create '${DC_API_KEY_SECRET}' in ${PROJECT_ID} with a Data Commons API key that does NOT have HTTP referrer restrictions (agentic apps call the MCP server directly from Python without a Referer header)." >&2
  exit 1
else
  echo "Verified Secret Manager secret ${DC_API_KEY_SECRET} exists in ${PROJECT_ID}."
  echo "Note: Ensure the API key in ${DC_API_KEY_SECRET} does not have HTTP referrer restrictions, as agentic apps call the MCP server directly from Python without a Referer header."
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

# 5. Verify or create the default Discover Model Armor template if configured in <ENV>.yaml.
if [[ -z "$MODEL_ARMOR_TEMPLATE_ID" || "$MODEL_ARMOR_TEMPLATE_ID" == "null" ]]; then
  echo "Note: '.agentic.discover.modelArmorTemplateId' is unset in ${CONFIG_YAML} (default location: ${MODEL_ARMOR_LOCATION})."
  echo "Remember to create a Model Armor template in ${MODEL_ARMOR_LOCATION} (or set '.agentic.discover.modelArmorTemplateId' to 'discover-${ENV}' and re-run ./setup_agentic.sh ${ENV}) before enabling Discover publicly."
else
  MODEL_ARMOR_TEMPLATE="projects/${PROJECT_ID}/locations/${MODEL_ARMOR_LOCATION}/templates/${MODEL_ARMOR_TEMPLATE_ID}"
  # `gcloud model-armor templates` does not route requests using the location in
  # the template path; set `api_endpoint_overrides/modelarmor` for this process
  # (preserving the mTLS endpoint when Certificate-Based Access is active).
  USE_MTLS=$(gcloud config get-value context_aware/use_client_certificate 2>/dev/null || true)
  ALWAYS_MTLS=$(gcloud config get-value context_aware/always_use_mtls_endpoint 2>/dev/null || true)
  if [[ "$USE_MTLS" =~ ^([Tt][Rr][Uu][Ee]|1)$ || "$ALWAYS_MTLS" =~ ^([Tt][Rr][Uu][Ee]|1)$ ]]; then
    MODEL_ARMOR_ENDPOINT="https://modelarmor.${MODEL_ARMOR_LOCATION}.rep.mtls.googleapis.com/"
  else
    MODEL_ARMOR_ENDPOINT="https://modelarmor.${MODEL_ARMOR_LOCATION}.rep.googleapis.com/"
  fi
  export CLOUDSDK_API_ENDPOINT_OVERRIDES_MODELARMOR="$MODEL_ARMOR_ENDPOINT"

  if DESCRIBE_ERR=$(gcloud model-armor templates describe "$MODEL_ARMOR_TEMPLATE" --project="$PROJECT_ID" --format=none 2>&1); then
    echo "Model Armor template ${MODEL_ARMOR_TEMPLATE} already exists."
  elif [[ "$DESCRIBE_ERR" =~ NOT_FOUND|[Nn]ot[[:space:]][Ff]ound ]]; then
    echo "Creating default Model Armor template ${MODEL_ARMOR_TEMPLATE}..."
    gcloud model-armor templates create "$MODEL_ARMOR_TEMPLATE" \
      --project="$PROJECT_ID" \
      --pi-and-jailbreak-filter-settings-enforcement=enabled \
      --pi-and-jailbreak-filter-settings-confidence-level=medium-and-above \
      --malicious-uri-filter-settings-enforcement=enabled \
      --basic-config-filter-enforcement=enabled \
      --rai-settings-filters=filterType=HATE_SPEECH,confidenceLevel=MEDIUM_AND_ABOVE \
      --rai-settings-filters=filterType=HARASSMENT,confidenceLevel=MEDIUM_AND_ABOVE \
      --rai-settings-filters=filterType=DANGEROUS,confidenceLevel=MEDIUM_AND_ABOVE \
      --rai-settings-filters=filterType=SEXUALLY_EXPLICIT,confidenceLevel=MEDIUM_AND_ABOVE
  else
    echo "$DESCRIBE_ERR" >&2
    exit 1
  fi
fi

# 6. Provision and seed the Discover GCS configuration bucket if configured in <ENV>.yaml.
if [[ -z "$CONFIG_BUCKET" || "$CONFIG_BUCKET" == "null" ]]; then
  echo "Note: '.agentic.discover.configBucket' is unset in ${CONFIG_YAML}."
  echo "Remember to set '.agentic.discover.configBucket' (e.g. '${PROJECT_ID}-discover-config') and re-run ./setup_agentic.sh ${ENV} to configure runtime settings in GCS."
else
  if DESCRIBE_BUCKET_ERR=$(gcloud storage buckets describe "gs://${CONFIG_BUCKET}" --project="$PROJECT_ID" --format=none 2>&1); then
    echo "GCS configuration bucket gs://${CONFIG_BUCKET} already exists."
  elif [[ "$DESCRIBE_BUCKET_ERR" =~ 404|NOT_FOUND|[Nn]ot[[:space:]][Ff]ound ]]; then
    if [[ -z "$CONFIG_BUCKET_LOCATION" ]]; then
      if [[ -t 0 ]]; then
        read -r -p "Location for new GCS bucket gs://${CONFIG_BUCKET} [${DEFAULT_BUCKET_LOCATION}]: " INPUT_LOCATION
        INPUT_LOCATION="${INPUT_LOCATION#"${INPUT_LOCATION%%[![:space:]]*}"}"
        INPUT_LOCATION="${INPUT_LOCATION%"${INPUT_LOCATION##*[![:space:]]}"}"
        CONFIG_BUCKET_LOCATION="${INPUT_LOCATION:-$DEFAULT_BUCKET_LOCATION}"
      else
        CONFIG_BUCKET_LOCATION="$DEFAULT_BUCKET_LOCATION"
      fi
    fi
    echo "Creating GCS configuration bucket gs://${CONFIG_BUCKET} in ${CONFIG_BUCKET_LOCATION}..."
    gcloud storage buckets create "gs://${CONFIG_BUCKET}" \
      --project="$PROJECT_ID" \
      --location="$CONFIG_BUCKET_LOCATION" \
      --uniform-bucket-level-access \
      --public-access-prevention
  else
    echo "$DESCRIBE_BUCKET_ERR" >&2
    exit 1
  fi

  echo "Ensuring uniform bucket-level access, public access prevention, and versioning on gs://${CONFIG_BUCKET}..."
  gcloud storage buckets update "gs://${CONFIG_BUCKET}" \
    --uniform-bucket-level-access \
    --public-access-prevention \
    --versioning \
    --project="$PROJECT_ID" >/dev/null

  echo "Granting roles/storage.objectViewer on gs://${CONFIG_BUCKET} to ${SERVICE_ACCOUNT}..."
  gcloud storage buckets add-iam-policy-binding "gs://${CONFIG_BUCKET}" \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/storage.objectViewer" \
    --project="$PROJECT_ID" >/dev/null

  if [[ ! -f "$DEFAULT_DISCOVER_AGENT_CONFIG" ]]; then
    echo "Error: Seed agent config file not found: ${DEFAULT_DISCOVER_AGENT_CONFIG}" >&2
    exit 1
  fi
  if ! command -v python3 >/dev/null 2>&1; then
    echo "Error: 'python3' is required to validate ${DEFAULT_DISCOVER_AGENT_CONFIG}." >&2
    exit 1
  fi
  # Note: `json.tool` checks JSON syntax only; validate field names and types
  # against `agent-config.schema.json` in `datacommonsorg/tools`.
  if ! python3 -m json.tool "$DEFAULT_DISCOVER_AGENT_CONFIG" >/dev/null; then
    echo "Error: ${DEFAULT_DISCOVER_AGENT_CONFIG} is not valid JSON." >&2
    exit 1
  fi
  echo "Ensuring initial configuration exists at gs://${CONFIG_BUCKET}/${DISCOVER_CONFIG_OBJECT} (no-clobber)..."
  gcloud storage cp --no-clobber "$DEFAULT_DISCOVER_AGENT_CONFIG" "gs://${CONFIG_BUCKET}/${DISCOVER_CONFIG_OBJECT}" \
    --content-type="application/json; charset=utf-8" \
    --project="$PROJECT_ID"
fi

echo "Successfully configured agentic app prerequisites for ${ENV}."
