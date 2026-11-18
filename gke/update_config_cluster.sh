#!/bin/bash
# Copyright 2023 Google LLC
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

function help {
  echo "Usage: $0 -e <ENV> [-l <REGION>] [-n] [-f]"
  echo "-e       Instance environment as defined under ../deploy/helm_charts/envs"
  echo "-l       GKE region Default: us-central1"
  echo "-n       Setup nodejs service"
  echo "-f       Allow replacing a live website-mci static IP if it differs from resolved IP"
  exit 1
}

ENV=""
LOCATION=""
SETUP_NODEJS=""
FORCE_IP_CHANGE=""
OPTIND=1
while getopts ":e:l:nf?" OPTION; do
  case $OPTION in
    e)
      ENV=$OPTARG
      ;;
    l)
      LOCATION=$OPTARG
      ;;
    n)
      SETUP_NODEJS=true
      ;;
    f)
      FORCE_IP_CHANGE=true
      ;;
    *)
      help
      ;;
  esac
done
shift $((OPTIND - 1))
if [[ $# -gt 0 ]]; then
  echo "Unexpected positional argument(s): $*" >&2
  help
fi

if [[ -z $ENV ]]; then
  echo "Set environment by -e" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DEFAULT_VALUES_YAML="../deploy/helm_charts/dc_website/values.yaml"
CONFIG_YAML="../deploy/helm_charts/envs/$ENV.yaml"

if [[ ! -f $CONFIG_YAML ]]; then
  echo "Error: Environment config not found: $CONFIG_YAML" >&2
  exit 1
fi

PROJECT_ID=$(yq eval -r '.project // ""' "$CONFIG_YAML")
if [[ -z $PROJECT_ID ]]; then
  echo "Error: 'project' is missing or empty in $CONFIG_YAML" >&2
  exit 1
fi
CLUSTER_PREFIX=$(yq eval -r '.cluster_prefix // ""' "$CONFIG_YAML")
CLUSTER_PREFIX="${CLUSTER_PREFIX:-website}"
AGENTIC_ENABLED=$(yq eval -r '.agentic.enabled' "$CONFIG_YAML")
if [[ -z $AGENTIC_ENABLED || $AGENTIC_ENABLED == "null" ]]; then
  AGENTIC_ENABLED=$(yq eval -r '.agentic.enabled' "$DEFAULT_VALUES_YAML")
fi
DISCOVER_ENABLED=$(yq eval -r '.agentic.discover.enabled' "$CONFIG_YAML")
if [[ -z $DISCOVER_ENABLED || $DISCOVER_ENABLED == "null" ]]; then
  DISCOVER_ENABLED=$(yq eval -r '.agentic.discover.enabled' "$DEFAULT_VALUES_YAML")
fi
DISCOVER_BASE_PATH=$(yq eval -r '.agentic.discover.basePath // ""' "$CONFIG_YAML")
if [[ -z $DISCOVER_BASE_PATH ]]; then
  DISCOVER_BASE_PATH=$(yq eval -r '.agentic.discover.basePath' "$DEFAULT_VALUES_YAML")
fi
DISCOVER_BASE_PATH="${DISCOVER_BASE_PATH%/}"

if [[ -z $LOCATION ]]; then
  LOCATION="us-central1"
fi

# Get gke credentials
CLUSTER_NAME="$CLUSTER_PREFIX-$LOCATION"
gcloud container clusters get-credentials "$CLUSTER_NAME" \
  --region="$LOCATION" --project="$PROJECT_ID"

# Resolve static IP from Helm env config first, falling back to global address 'dc-website-ip'
IP=$(yq eval -r '.ip // ""' "$CONFIG_YAML")
if [[ -z $IP ]]; then
  IP=$(gcloud compute addresses list --global --project="$PROJECT_ID" --filter='name=dc-website-ip' --format='value(ADDRESS)')
  if [[ -z $IP ]]; then
    echo "Error: Static IP not found in $CONFIG_YAML (.ip) or global address 'dc-website-ip' in project $PROJECT_ID" >&2
    exit 1
  fi
fi

# Guard against unintentionally overwriting a live website-mci static IP with a stale YAML value
EXISTING_MCI=$(kubectl get mci website-mci -n website --ignore-not-found -o yaml)
if [[ -n $EXISTING_MCI ]]; then
  EXISTING_STATIC_IP=$(yq eval -r '.metadata.annotations."networking.gke.io/static-ip" // ""' - <<< "$EXISTING_MCI")
  EXISTING_VIP=$(yq eval -r '.status.VIP // ""' - <<< "$EXISTING_MCI")
  if [[ ( -n $EXISTING_STATIC_IP && $EXISTING_STATIC_IP != "$IP" ) || ( -n $EXISTING_VIP && $EXISTING_VIP != "$IP" ) ]]; then
    LIVE_STATE="static-ip=${EXISTING_STATIC_IP:-<unset>}, status.VIP=${EXISTING_VIP:-<unset>}"
    if [[ $FORCE_IP_CHANGE == "true" ]]; then
      echo "Warning: Replacing live website-mci static IP ($LIVE_STATE -> $IP) in project $PROJECT_ID (-f specified)." >&2
    else
      echo "Error: Resolved static IP ($IP) does not match live website-mci ($LIVE_STATE) in project $PROJECT_ID." >&2
      echo "Verify $CONFIG_YAML (.ip) matches the live ingress, or re-run with -f to intentionally replace the ingress IP." >&2
      exit 1
    fi
  fi
fi

# Update backendconfig and mci config
cp backendconfig.yaml.tpl backendconfig.yaml
cp mci.yaml.tpl mci.yaml
IP="$IP" yq eval -i '.metadata.annotations."networking.gke.io/static-ip" = strenv(IP)' mci.yaml
# If not setting up nodejs service, remove the nodejs path from the mci.yaml
if [[ $SETUP_NODEJS != "true" ]]; then
  yq eval -i 'del(.spec.template.spec.rules.[].http.paths[] | select(.backend.serviceName == "website-nodejs-mcs"))' mci.yaml
fi
# Populate or remove the agentic backendconfig and discover paths based on agentic config
if [[ $AGENTIC_ENABLED != "true" ]]; then
  yq eval -i 'select(.metadata.name != "backendconfig-agentic")' backendconfig.yaml
fi
if [[ $AGENTIC_ENABLED == "true" && $DISCOVER_ENABLED == "true" ]]; then
  export DISCOVER_BASE_PATH
  export DISCOVER_WILDCARD_PATH="${DISCOVER_BASE_PATH}/*"
  yq eval -i '(.spec.template.spec.rules.[].http.paths[] | select(.path == "<DISCOVER_BASE_PATH>").path) = env(DISCOVER_BASE_PATH)' mci.yaml
  yq eval -i '(.spec.template.spec.rules.[].http.paths[] | select(.path == "<DISCOVER_BASE_PATH>/*").path) = env(DISCOVER_WILDCARD_PATH)' mci.yaml
else
  yq eval -i 'del(.spec.template.spec.rules.[].http.paths[] | select(.path == "<DISCOVER_BASE_PATH>" or .path == "<DISCOVER_BASE_PATH>/*"))' mci.yaml
fi

# Apply configs
kubectl apply -f backendconfig.yaml
kubectl apply -f mci.yaml
kubectl apply -f website_mcs.yaml
# If setting up nodejs service, apply the mcs yaml definition for nodejs
if [[ $SETUP_NODEJS == "true" ]]; then
  kubectl apply -f website_nodejs_mcs.yaml
fi
# If agentic apps are enabled, apply the mcs yaml definition for agentic apps
if [[ $AGENTIC_ENABLED == "true" ]]; then
  kubectl apply -f website_agentic_mcs.yaml
fi

# Check the status: `kubectl describe mci website-mci -n website`

