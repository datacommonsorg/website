#!/bin/bash
# Copyright 2024 Google LLC
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


# Script to update place summary config map
#
# Example: ./scripts/update_place_summary_config.sh dev

set -e

ENV=$1

LOCATION="us-central1"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$(dirname "$DIR")"

PROJECT_ID=$(yq eval '.project' $ROOT/deploy/helm_charts/envs/$ENV.yaml)
CLUSTER_PREFIX=$(yq eval '.cluster_prefix' $ROOT/deploy/helm_charts/envs/$ENV.yaml)
CLUSTER_NAME=$CLUSTER_PREFIX-$LOCATION

gcloud container clusters get-credentials $CLUSTER_NAME --region=$LOCATION --project=$PROJECT_ID

kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: place-summary-config
  namespace: website
data:
  place_summary_content.json: |
$(cat $ROOT/server/place_summary_content.json | sed 's/^/    /')
EOF