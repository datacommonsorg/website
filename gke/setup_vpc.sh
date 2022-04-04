#!/bin/bash
# Copyright 2022 Google LLC
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

# This scripts sets up a VPC peering connection to servicenetworking.

set -e

ENV=$1
REGION=$2

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$(dirname "$DIR")"

if [[ $REGION == "" ]]; then
  REGION=$(yq eval '.region.primary' $ROOT/deploy/gke/$ENV.yaml)
fi

PROJECT_ID=$(yq eval '.project' $ROOT/deploy/gke/$ENV.yaml)
NETWORK_NAME="default"
PEERING_RANGE_NAME="${NETWORK_NAME}-internal-ip"

gcloud services enable servicenetworking.googleapis.com --project=${PROJECT_ID}
gcloud services enable dns.googleapis.com --project=${PROJECT_ID}

gcloud compute addresses create ${PEERING_RANGE_NAME} \
  --global \
  --prefix-length=16 \
  --description="Peering range for Google service" \
  --network=${NETWORK_NAME} \
  --purpose=VPC_PEERING \
  --project=${PROJECT_ID}

gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --network=${NETWORK_NAME} \
  --ranges=$PEERING_RANGE_NAME \
  --project=$PROJECT_ID
