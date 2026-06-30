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

# This script generates and renders the deployed Kubernetes configurations (YAML manifests)
# for the Data Commons Website and/or Mixer components using 'skaffold render'.
#
# Usage:
#   ./scripts/generate_deployment_config.sh [options] <profile>
#
# Examples:
#   ./scripts/generate_deployment_config.sh website-prod
#   ./scripts/generate_deployment_config.sh -w custom-web-tag -m custom-mixer-tag -o ./rendered-manifests website-prod
#
# Options:
#   -w <tag>  Override the website image tag (default: 'latest')
#   -m <tag>  Override the mixer image tag (default: 'latest')
#   -o <dir>  Directory to save rendered YAML files (default: print to stdout)
#   -h        Show this help message
#
# Arguments:
#   <profile>  Skaffold profile name (e.g. 'website-prod')

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
if ! command -v skaffold &> /dev/null; then
  log_error "skaffold is not installed. Please install skaffold."
  exit 1
fi

if ! command -v helm &> /dev/null; then
  log_error "helm is not installed. Please install helm (v3+)."
  exit 1
fi

if ! command -v yq &> /dev/null; then
  log_error "yq is not installed. Please install yq."
  exit 1
fi

function show_help {
  echo "Usage: $0 [options] <profile>"
  echo ""
  echo "Options:"
  echo "  -w <tag>    Override the website image tag (default: 'latest')"
  echo "  -m <tag>    Override the mixer image tag (default: 'latest')"
  echo "  -o <dir>    Directory to save rendered YAML files (default: print to stdout)"
  echo "  -h          Show this help message"
  echo ""
  echo "Arguments:"
  echo "  <profile>  Skaffold profile name (e.g. 'website-prod')"
  exit 1
}

# Parse options using getopts
WEBSITE_TAG="latest"
MIXER_TAG="latest"
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
  log_error "Target profile or environment name is required."
  show_help
fi

PROFILE="$TARGET_ENV"

# Verify that the profile exists in skaffold.yaml
AVAILABLE_PROFILES=$(yq eval '.profiles[].name' "$ROOT/skaffold.yaml" 2>/dev/null || true)
if ! echo "$AVAILABLE_PROFILES" | grep -Fxq "$PROFILE"; then
  log_error "Unknown Skaffold profile: '$TARGET_ENV'"
  echo "Available profiles in skaffold.yaml:" >&2
  echo "  - ${AVAILABLE_PROFILES//$'\n'/$'\n  - '}" >&2
  exit 1
fi

log_notice "Rendering templates for profile '$PROFILE'..."

export WEBSITE_GITHASH="$WEBSITE_TAG"
export MIXER_GITHASH="$MIXER_TAG"

# Run skaffold render from the repository root
cd "$ROOT"./

if [[ -n "$OUTPUT_DIR" ]]; then
  mkdir -p "$OUTPUT_DIR"
  if ! skaffold render -p "$PROFILE" --digest-source=none --output "$OUTPUT_DIR/rendered.yaml" > /dev/null; then
    log_error "Skaffold render failed."
    exit 1
  fi
  log_success "Successfully generated deployed config: $OUTPUT_DIR/rendered.yaml"
else
  if ! skaffold render -p "$PROFILE" --digest-source=none; then
    log_error "Skaffold render failed."
    exit 1
  fi
fi
