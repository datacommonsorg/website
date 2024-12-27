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

# Create API keys and store them in the config.

CONFIG_YAML="../deploy/helm_charts/envs/$1.yaml"

PROJECT_ID=$(yq eval '.project' $CONFIG_YAML)
DOMAIN=$(yq eval '.domain' $CONFIG_YAML)

gcloud config set project $PROJECT_ID

# Create API key for maps and places API
gcloud alpha services api-keys create \
  --display-name=maps-api-key \
  --allowed-referrers=$DOMAIN \
  --api-target=service=maps_backend \
  --api-target=service=places_backend

API_KEY_NAME=$(gcloud alpha services api-keys list --filter='displayName=maps-api-key' --format='value(name)')
KEY_STRING=$(gcloud alpha services api-keys get-key-string $API_KEY_NAME --format='value(keyString)')

touch /tmp/dc-website-api-key
> /tmp/dc-website-api-key
echo "$KEY_STRING" >> /tmp/dc-website-api-key
gcloud secrets create maps-api-key --data-file=/tmp/dc-website-api-key

# Create API key for Data Commons API
gcloud alpha services api-keys create \
  --display-name=mixer-api-key \
  --allowed-referrers=$DOMAIN \
  --api-target=service=api.datacommons.org

API_KEY_NAME=$(gcloud alpha services api-keys list --filter='displayName=mixer-api-key' --format='value(name)')
KEY_STRING=$(gcloud alpha services api-keys get-key-string $API_KEY_NAME --format='value(keyString)')

touch /tmp/mixer-api-key
> /tmp/mixer-api-key
echo "$KEY_STRING" >> /tmp/mixer-api-key
gcloud secrets create mixer-api-key --data-file=/tmp/mixer-api-key

# Create API key for Generative Language API
gcloud alpha services api-keys create \
  --display-name=nl-palm-api-key \
  --allowed-referrers=$DOMAIN \
  --api-target=service=generativelanugage.googleapis.com

API_KEY_NAME=$(gcloud alpha services api-keys list --filter='displayName=nl-palm-api-key' --format='value(name)')
KEY_STRING=$(gcloud alpha services api-keys get-key-string $API_KEY_NAME --format='value(keyString)')

touch /tmp/palm-api-key
> /tmp/palm-api-key
echo "$KEY_STRING" >> /tmp/palm-api-key
gcloud secrets create palm-api-key --data-file=/tmp/palm-api-key
