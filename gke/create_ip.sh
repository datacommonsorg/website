#!/bin/bash
# Copyright 2020 Google LLC
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

if [[ -z $1 ]]; then
  echo "Usage: $0 <ENV>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_YAML="$SCRIPT_DIR/../deploy/helm_charts/envs/$1.yaml"

if [[ ! -f $CONFIG_YAML ]]; then
  echo "Error: Environment config not found: $CONFIG_YAML" >&2
  exit 1
fi

PROJECT_ID=$(yq eval '.project' "$CONFIG_YAML")

# Create a static IP address for the API
gcloud compute addresses create dc-website-ip --global --project="$PROJECT_ID"

# Record the IP address.
IP=$(gcloud compute addresses list --global --project="$PROJECT_ID" --filter='name=dc-website-ip' --format='value(ADDRESS)')
if [[ -z $IP ]]; then
  echo "Error: Static IP 'dc-website-ip' not found after creation in project $PROJECT_ID" >&2
  exit 1
fi

IP="$IP" yq eval -i '.ip = strenv(IP)' "$CONFIG_YAML"

