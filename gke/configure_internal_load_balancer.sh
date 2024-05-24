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

# Configures internal load balancer requirements
# (1) proxy subnet
# (2) self-signed certificate for internal load balancer
# (3) private cloud dns zone

ENV=$1
REGION=$2

CONFIG_YAML="../deploy/helm_charts/envs/$ENV.yaml"

PROJECT_ID=$(yq eval '.project' $CONFIG_YAML)

echo $PROJECT_ID
gcloud config set project $PROJECT_ID

# Create proxy-only subnet (required for internal load balancers)
gcloud compute networks subnets create website-internal-lb-proxy-subnet \
    --purpose=REGIONAL_MANAGED_PROXY \
    --role=ACTIVE \
    --region=$REGION \
    --network=default \
    --range=10.1.0.0/24

# Create self-signed certificate for internal load balancer SSL communication
openssl req -newkey rsa:2048 -keyout website-ilb.key -x509 -days 365 -out website-ilb.crt -nodes -subj "/CN=website-ilb.website.internal"
gcloud compute ssl-certificates create website-ilb     --certificate website-ilb.crt     --private-key website-ilb.key     --region us-central1

# Create private cloud dns zone
gcloud dns managed-zones create dc-zone \
    --dns-name=website.internal \
    --networks=default \
    --description="Data Commons private dns zone" \
    --visibility=private

# Reserve internal static IP address for the internal load balancer
gcloud compute addresses create website-ilb-ip \
    --region $REGION --subnet default \
    --addresses 10.128.0.42

# Create DNS record for internal load balancer
gcloud dns record-sets transaction start \
   --zone=dc-zone
gcloud dns record-sets transaction add 10.128.0.42 \
   --name=website-ilb.website.internal \
   --ttl=60 \
   --type=A \
   --zone=dc-zone
gcloud dns record-sets transaction execute \
   --zone=dc-zone