#!/bin/bash
# Copyright 2024 Google LLC
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


# Grant service account permission to access Verte AI services in datcom-nl
# account

set -e

CONFIG_YAML="../deploy/helm_charts/envs/$1.yaml"

PROJECT_ID=$(yq eval '.project' $CONFIG_YAML)

NL_PROJECT_ID=datcom-nl
NAME="website-robot"
SERVICE_ACCOUNT="$NAME@$PROJECT_ID.iam.gserviceaccount.com"

# NL project roles
declare -a nl_roles=(
    "roles/aiplatform.user"   # Vertex AI User
)
for role in "${nl_roles[@]}"
do
  gcloud projects add-iam-policy-binding $NL_PROJECT_ID \
    --member serviceAccount:$SERVICE_ACCOUNT \
    --role $role
done
