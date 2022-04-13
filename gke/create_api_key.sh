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

# Create an API key for maps and places API and store it in the config.


PROJECT_ID=$(yq eval '.project' config.yaml)
DOMAIN=$(yq eval '.domain' config.yaml)

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