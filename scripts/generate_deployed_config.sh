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

set -e

# Resolve paths relative to the script location
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$(dirname "$DIR")"

# Source centralized logging and utilities if available
if [[ -f "$DIR/utils.sh" ]]; then
  source "$DIR/utils.sh"
else
  # Fallback logging if utils.sh is missing
  log_notice() { echo -e "\033[0;34m[NOTICE]\033[0m  $1"; }
  log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m  $1"; }
  log_warn() { echo -e "\033[0;33m[WARN]\033[0m  $1"; }
  log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1" >&2; }
fi

# Verify necessary dependencies
if ! command -v helm &> /dev/null; then
  log_error "helm is not installed. Please install helm (v3+)."
  exit 1
fi

if ! command -v yq &> /dev/null; then
  log_error "yq is not installed. Please install yq."
  exit 1
fi

function show_help {
  echo "Usage: $0 [options] <project-id-or-env-name>"
  echo ""
  echo "Options:"
  echo "  -w <tag>    Override the website image tag (default: git short hash or value in env yaml)"
  echo "  -m <tag>    Override the mixer image tag (default: git short hash)"
  echo "  -o <dir>    Directory to save rendered YAML files (default: print to stdout)"
  echo "  -h          Show this help message"
  echo ""
  echo "Arguments:"
  echo "  <project-id-or-env-name>  GCP Project ID (e.g. 'datcom-website-prod') or Environment Name (e.g. 'prod')"
  exit 1
}

# Parse options using getopts
WEBSITE_TAG=""
MIXER_TAG=""
OUTPUT_DIR=""

while getopts ":w:m:o:h" OPTION; do
  case $OPTION in
    w)
      WEBSITE_TAG=$OPTARG
      ;;
    m)
      MIXER_TAG=$OPTARG
      ;;
    o)
      OUTPUT_DIR=$OPTARG
      ;;
    h)
      show_help
      ;;
    *)
      show_help
      ;;
  esac
done
shift $((OPTIND-1))

TARGET_ENV=$1

if [[ -z "$TARGET_ENV" ]]; then
  log_error "Target project ID or environment name is required."
  show_help
fi

# Check for charts directories
if [[ "$MIXER_ONLY" != "true" ]]; then
  if [[ ! -d "$ROOT/deploy/helm_charts/dc_website" ]]; then
    log_error "Website chart directory not found at $ROOT/deploy/helm_charts/dc_website."
    exit 1
  fi
fi

if [[ ! -d "$ROOT/mixer/deploy/helm_charts/mixer" ]]; then
  log_error "Mixer chart directory not found at $ROOT/mixer/deploy/helm_charts/mixer."
  log_error "Please make sure you have checked out submodules: git submodule update --init --recursive"
  exit 1
fi

# Locate the config YAML file
ENV_YAML=""
ENV_NAME=""
MIXER_ONLY=false

# 1. Search for a matching project: value in deploy/helm_charts/envs/*.yaml
for f in "$ROOT"/deploy/helm_charts/envs/*.yaml; do
  if [[ -f "$f" ]]; then
    PROJ=$(yq eval '.project' "$f" 2>/dev/null)
    if [[ "$PROJ" == "$TARGET_ENV" ]]; then
      ENV_YAML="$f"
      ENV_NAME=$(basename "$f" .yaml)
      break
    fi
  fi
done

# 2. If not found by project, search for a matching project in mixer/deploy/helm_charts/envs/*.yaml
if [[ -z "$ENV_YAML" ]]; then
  for f in "$ROOT"/mixer/deploy/helm_charts/envs/*.yaml; do
    if [[ -f "$f" ]]; then
      PROJ=$(yq eval '.project' "$f" 2>/dev/null)
      if [[ "$PROJ" == "$TARGET_ENV" ]]; then
        ENV_YAML="$f"
        ENV_NAME=$(basename "$f" .yaml)
        MIXER_ONLY=true
        break
      fi
    fi
  done
fi

# 3. If not found by project, check if it matches an env filename directly in deploy/helm_charts/envs/
if [[ -z "$ENV_YAML" ]]; then
  if [[ -f "$ROOT/deploy/helm_charts/envs/$TARGET_ENV.yaml" ]]; then
    ENV_YAML="$ROOT/deploy/helm_charts/envs/$TARGET_ENV.yaml"
    ENV_NAME="$TARGET_ENV"
  fi
fi

# 4. If still not found, check if it matches an env filename directly in mixer/deploy/helm_charts/envs/
if [[ -z "$ENV_YAML" ]]; then
  if [[ -f "$ROOT/mixer/deploy/helm_charts/envs/$TARGET_ENV.yaml" ]]; then
    ENV_YAML="$ROOT/mixer/deploy/helm_charts/envs/$TARGET_ENV.yaml"
    ENV_NAME="$TARGET_ENV"
    MIXER_ONLY=true
  fi
fi

# 5. If still not found, list available envs/projects and exit
if [[ -z "$ENV_YAML" ]]; then
  log_error "Could not find configuration for target: '$TARGET_ENV'"
  echo "Available environments/projects:" >&2
  for f in "$ROOT"/deploy/helm_charts/envs/*.yaml "$ROOT"/mixer/deploy/helm_charts/envs/*.yaml; do
    if [[ -f "$f" ]]; then
      PROJ=$(yq eval '.project' "$f" 2>/dev/null)
      NAME=$(basename "$f" .yaml)
      if [[ "$PROJ" != "null" && -n "$PROJ" ]]; then
        echo "  - $NAME (Project ID: $PROJ)" >&2
      else
        echo "  - $NAME" >&2
      fi
    fi
  done
  exit 1
fi

log_notice "Using environment configuration: $ENV_YAML"

PROJECT_ID=$(yq eval '.project' "$ENV_YAML")
NAMESPACE=$(yq eval '.namespace.name' "$ENV_YAML")
if [[ "$NAMESPACE" == "null" || -z "$NAMESPACE" ]]; then
  if [[ "$MIXER_ONLY" == "true" ]]; then
    NAMESPACE="mixer"
  else
    NAMESPACE="website"
  fi
fi

# Determine website image tag
if [[ "$MIXER_ONLY" != "true" ]]; then
  if [[ -z "$WEBSITE_TAG" ]]; then
    WEBSITE_TAG=$(yq eval '.website.image.tag' "$ENV_YAML")
    if [[ "$WEBSITE_TAG" == "null" || -z "$WEBSITE_TAG" ]]; then
      cd "$ROOT"
      WEBSITE_TAG=$(git rev-parse --short=7 HEAD 2>/dev/null || echo "latest")
    fi
  fi
fi

# Determine mixer image tag
if [[ -z "$MIXER_TAG" ]]; then
  if [[ -d "$ROOT/mixer" ]]; then
    cd "$ROOT/mixer"
    MIXER_TAG=$(git rev-parse --short=7 HEAD 2>/dev/null || echo "latest")
    cd "$ROOT"
  else
    MIXER_TAG="$WEBSITE_TAG"
  fi
fi

ESP_SERVICE_NAME=$(yq eval '.mixer.serviceName' "$ENV_YAML")
if [[ "$ESP_SERVICE_NAME" == "null" || -z "$ESP_SERVICE_NAME" ]]; then
  ESP_SERVICE_NAME="website-esp.endpoints.$PROJECT_ID.cloud.goog"
fi

# Dynamic service urls based on default names for local/in-cluster routing
WEBSITE_SERVICE_URL="http://website-service:8080"
NODEJS_SERVICE_URL="http://website-nodejs-service:8080"

log_notice "Rendering templates for namespace '$NAMESPACE'..."

# Build helm arguments
HELM_ARGS=(
  dc-mixer
  "$ROOT/mixer/deploy/helm_charts/mixer"
  --namespace "$NAMESPACE"
  -f "$ENV_YAML"
  --set ingress.enabled="false"
  --set mixer.image.tag="$MIXER_TAG"
  --set mixer.githash="$MIXER_TAG"
  --set mixer.serviceName="$ESP_SERVICE_NAME"
  --set mixer.hostProject="$PROJECT_ID"
  --set-file mixer.schemaConfigs."base\.mcf"="$ROOT/mixer/deploy/mapping/base.mcf"
  --set-file mixer.schemaConfigs."encode\.mcf"="$ROOT/mixer/deploy/mapping/encode.mcf"
  --set-file kgStoreConfig.bigqueryVersion="$ROOT/mixer/deploy/storage/bigquery.version"
  --set-file kgStoreConfig.baseBigtableInfo="$ROOT/mixer/deploy/storage/base_bigtable_info.yaml"
  --set-file kgStoreConfig.spannerGraphInfo="$ROOT/mixer/deploy/storage/spanner_graph_info.yaml"
)

# Handle missing mixer.redis.configFile gracefully when mixer.redis.enabled is true.
# This prevents Helm rendering errors during local test/capacity simulations when the values
# file depends on external overrides (e.g. Skaffold setValues).
MIXER_REDIS_ENABLED=$(yq eval '.mixer.redis.enabled' "$ENV_YAML" 2>/dev/null)
MIXER_REDIS_CONFIG_FILE=$(yq eval '.mixer.redis.configFile' "$ENV_YAML" 2>/dev/null)
if [[ "$MIXER_REDIS_ENABLED" == "true" && ( "$MIXER_REDIS_CONFIG_FILE" == "null" || -z "$MIXER_REDIS_CONFIG_FILE" ) ]]; then
  log_warn "mixer.redis.configFile is missing in $ENV_YAML. Supplying a dummy configuration for template rendering."
  HELM_ARGS+=(--set mixer.redis.configFile="instances: []")
fi

# Render Mixer templates
MIXER_RENDER=$(helm template "${HELM_ARGS[@]}")

# Render Website templates
WEBSITE_RENDER=""
if [[ "$MIXER_ONLY" != "true" ]]; then
  WEBSITE_RENDER=$(helm template dc-website "$ROOT/deploy/helm_charts/dc_website" \
    --namespace "$NAMESPACE" \
    -f "$ENV_YAML" \
    --set website.image.tag="$WEBSITE_TAG" \
    --set website.githash="$WEBSITE_TAG" \
    --set nodejs.apiRoot="$WEBSITE_SERVICE_URL" \
    --set cronTesting.webApiRoot="$WEBSITE_SERVICE_URL" \
    --set cronTesting.nodejsApiRoot="$NODEJS_SERVICE_URL")
fi

# Output rendered files
if [[ -n "$OUTPUT_DIR" ]]; then
  mkdir -p "$OUTPUT_DIR"
  echo "$MIXER_RENDER" > "$OUTPUT_DIR/dc-mixer.yaml"
  log_success "Successfully generated deployed config files in '$OUTPUT_DIR':"
  echo "  - $OUTPUT_DIR/dc-mixer.yaml"
  if [[ "$MIXER_ONLY" != "true" ]]; then
    echo "$WEBSITE_RENDER" > "$OUTPUT_DIR/dc-website.yaml"
    echo "  - $OUTPUT_DIR/dc-website.yaml"
  fi
else
  echo "---"
  echo "# Rendered Mixer Configuration (dc-mixer)"
  echo "---"
  echo "$MIXER_RENDER"
  if [[ "$MIXER_ONLY" != "true" ]]; then
    echo ""
    echo "---"
    echo "# Rendered Website Configuration (dc-website)"
    echo "---"
    echo "$WEBSITE_RENDER"
  fi
fi
