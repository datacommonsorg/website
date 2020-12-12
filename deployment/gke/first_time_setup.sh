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

# Valid argument would be: "staging", "prod"
ENV=$1
if [[ $ENV != "staging" ]] && [[ $ENV != "prod" ]]; then
    echo "Invalid environment: $ENV"
    exit
fi

../generate_yaml.sh $ENV

PROJECT_ID=$(yq r ../config.yaml project.$ENV)

# # Update gcloud
# gcloud components update

# # Auth
# gcloud auth login

# Set project
gcloud config set project $PROJECT_ID

# # Project level setup
# ./config_project.sh $PROJECT_ID

# # Create robot account and download robot account key
# ./create_robot_account.sh $PROJECT_ID

# # Config robot account IAM
# ./config_robot_account.sh $PROJECT_ID

# # Create certificate
# # !! This is crucial to get the ingress external IP working.
# ./setup_ssl.sh $(yq r cluster.yaml domain.$ENV)

# # Deploy esp service
# ./setup_esp.sh $ENV

# Setup cluster in primary region
PRIMARY_REGION=$(yq r cluster.yaml region.$ENV.primary)
# ./create_cluster.sh $PROJECT_ID $PRIMARY_REGION $(yq r ../config.yaml scaling.nodes.$ENV)

# Setup cluster in other regions
len=$(yq r cluster.yaml --length region.$ENV.others)
for index in $(seq 0 $(($len-1)));
do
  REGION=$(yq r cluster.yaml region.$ENV.others[$index])
  ./create_cluster.sh $PROJECT_ID $REGION $(yq r ../config.yaml scaling.nodes.$ENV)
done

./setup_config_cluster.sh $PROJECT_ID $PRIMARY_REGION $ENV