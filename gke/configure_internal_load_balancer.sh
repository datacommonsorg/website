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

IP_ADDRESS=""
if [ "$REGION" == "us-central1" ]; then
  IP_ADDRESS="10.128.0.42"
elif [ "$REGION" == "us-west1" ]; then
  IP_ADDRESS="10.138.0.42"
elif [ "$REGION" == "us-west2" ]; then
  IP_ADDRESS="10.168.0.42"
else
  echo "IP address not specified for region $REGION"
  exit 1
fi

# Create proxy-only subnet (required for internal load balancers)
if gcloud compute networks subnets describe website-internal-lb-proxy-subnet > /dev/null 2>&1; then
  gcloud compute networks subnets delete website-internal-lb-proxy-subnet
fi
gcloud compute networks subnets create website-internal-lb-proxy-subnet \
    --purpose=REGIONAL_MANAGED_PROXY \
    --role=ACTIVE \
    --region=$REGION \
    --network=default \
    --range=10.1.0.0/24

# Create self-signed certificate for internal load balancer SSL communication
openssl req \
    -newkey rsa:2048 \
    -out website-ilb.crt \
    -keyout website-ilb.key \
    -subj "/CN=website-ilb.website.internal" \
    -x509 \
    -days 365 \
    -nodes

if gcloud compute ssl-certificates describe website-ilb --region "$REGION" > /dev/null 2>&1; then
  gcloud compute ssl-certificates delete website-ilb --region "$REGION"
fi
gcloud compute ssl-certificates create website-ilb \
    --certificate website-ilb.crt \
    --private-key website-ilb.key \
    --region $REGION

# Reserve internal static IP address for the internal load balancer
if gcloud compute addresses describe website-ilb-ip --region "$REGION" > /dev/null 2>&1; then
  gcloud compute addresses delete website-ilb-ip --region "$REGION"
fi
gcloud compute addresses create website-ilb-ip \
    --region $REGION --subnet default \
    --addresses $IP_ADDRESS

# Create DNS record for internal load balancer
if gcloud dns managed-zones describe dc-zone > /dev/null 2>&1; then
  echo "Managed zone already exists. Skipping creation."
else
  gcloud dns managed-zones create dc-zone \
      --dns-name=website.internal \
      --networks=default \
      --description="Data Commons private dns zone" \
      --visibility=private
fi
gcloud dns record-sets transaction start --zone=dc-zone
gcloud dns record-sets transaction add $IP_ADDRESS \
   --name=website-ilb.website.internal \
   --ttl=60 \
   --type=A \
   --zone=dc-zone
gcloud dns record-sets transaction execute \
   --zone=dc-zone