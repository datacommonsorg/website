#!/bin/bash
# Copyright 2020 Google LLC
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
  echo "Usage: $0 <ENV> <REGION> [-n] [-f]"
  echo "  <ENV>     Instance environment as defined under ../deploy/helm_charts/envs"
  echo "  <REGION>  GKE region of the config cluster (e.g. us-central1)"
  echo "  -n        Setup nodejs service"
  echo "  -f        Allow replacing a live website-mci static IP if it differs from resolved IP"
  exit 1
}

SETUP_NODEJS=""
FORCE_IP_CHANGE=""
POSITIONAL_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -n)
      SETUP_NODEJS=true
      shift
      ;;
    -f)
      FORCE_IP_CHANGE=true
      shift
      ;;
    -h|--help|-\?)
      help
      ;;
    -*)
      echo "Unknown option: $1" >&2
      help
      ;;
    *)
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ ${#POSITIONAL_ARGS[@]} -ne 2 || -z ${POSITIONAL_ARGS[0]} || -z ${POSITIONAL_ARGS[1]} ]]; then
  help
fi

ENV="${POSITIONAL_ARGS[0]}"
REGION="${POSITIONAL_ARGS[1]}"

# https://cloud.google.com/kubernetes-engine/docs/how-to/multi-cluster-ingress-setup

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_YAML="$SCRIPT_DIR/../deploy/helm_charts/envs/$ENV.yaml"

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
CLUSTER_NAME="$CLUSTER_PREFIX-$REGION"

CONFIG_MEMBERSHIP=$(gcloud container hub memberships list \
  --project="$PROJECT_ID" \
  --filter="name.basename()=$CLUSTER_NAME" \
  --limit=1 \
  --uri)
if [[ -z $CONFIG_MEMBERSHIP ]]; then
  echo "Error: Fleet membership '$CLUSTER_NAME' not found in project $PROJECT_ID" >&2
  exit 1
fi

gcloud beta container hub ingress enable \
  --config-membership="$CONFIG_MEMBERSHIP" \
  --project="$PROJECT_ID"

UPDATE_ARGS=(-e "$ENV" -l "$REGION")
if [[ $SETUP_NODEJS == "true" ]]; then
  UPDATE_ARGS+=(-n)
fi
if [[ $FORCE_IP_CHANGE == "true" ]]; then
  UPDATE_ARGS+=(-f)
fi

"$SCRIPT_DIR/update_config_cluster.sh" "${UPDATE_ARGS[@]}"

