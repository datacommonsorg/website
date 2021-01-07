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

PROJECT_ID=$(yq r config.yaml project)

# Update gcloud
gcloud components update

# Auth
gcloud auth login

# Project level setup
./enable_services.sh

# Create robot account
./create_robot_account.sh

# Config robot account IAM
./setup_robot_account.sh

# Create certificate
# !! This is crucial to get the ingress external IP working.
./setup_ssl.sh

# Deploy esp service
./setup_esp.sh

# Setup cluster in primary region
PRIMARY_REGION=$(yq r config.yaml region.primary)
./create_cluster.sh $PRIMARY_REGION

# Setup cluster in other regions
len=$(yq r config.yaml --length region.others)
for index in $(seq 0 $(($len-1)));
do
  REGION=$(yq r config.yaml region.others[$index])
  ./create_cluster.sh $REGION
done

./setup_config_cluster.sh