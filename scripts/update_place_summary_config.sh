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

# Use delete then create pattern because `kubectl apply` has memory limits
kubectl delete configmap place-summary-config-country -n website --ignore-not-found
kubectl create configmap place-summary-config-country \
  --namespace=website \
  --from-file=place_summaries.json=$ROOT/server/config/summaries/place_summaries_for_country_.json

kubectl delete configmap place-summary-config-geoid-0-2 -n website --ignore-not-found
kubectl create configmap place-summary-config-geoid-0-2 \
  --namespace=website \
  --from-file=place_summaries.json=$ROOT/server/config/summaries/place_summaries_for_geoId_0-2.json

kubectl delete configmap place-summary-config-geoid-3-5 -n website --ignore-not-found
kubectl create configmap place-summary-config-geoid-3-5 \
  --namespace=website \
  --from-file=place_summaries.json=$ROOT/server/config/summaries/place_summaries_for_geoId_3-5.json

kubectl delete configmap place-summary-config-geoid-6-9 -n website --ignore-not-found
kubectl create configmap place-summary-config-geoid-6-9 \
  --namespace=website \
  --from-file=place_summaries.json=$ROOT/server/config/summaries/place_summaries_for_geoId_6-9.json

kubectl delete configmap place-summary-config-wikidataid -n website --ignore-not-found
kubectl create configmap place-summary-config-wikidataid \
  --namespace=website \
  --from-file=place_summaries.json=$ROOT/server/config/summaries/place_summaries_for_wikidataId_.json

kubectl delete configmap place-summary-config-others -n website --ignore-not-found
kubectl create configmap place-summary-config-others \
  --namespace=website \
  --from-file=place_summaries.json=$ROOT/server/config/summaries/place_summaries_others.json
