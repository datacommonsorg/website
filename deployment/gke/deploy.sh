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

ENV=$1
REGION=$2

PROJECT_ID=$(yq r ../config.yaml project.$ENV)
../generate_yaml.sh $ENV

gcloud config set project $PROJECT_ID

# Valid argument would be: "staging", "prod"
if [[ $ENV != "staging" ]] && [[ $ENV != "prod" ]]; then
    echo "Invalid environment: $ENV"
    exit
fi

if [[ $REGION == "" ]]; then
  echo "Second argument (region) is empty"
  exit
fi

CLUSTER_NAME="website-$REGION"

gcloud container clusters get-credentials $CLUSTER_NAME --region=$REGION

kubectl apply -f deployment.yaml