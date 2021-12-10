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


# Grant service account permission to access Data Commons data storage, including
# Cloud BigTable and BigQuery.

set -e

PROJECT_ID=$1
if [[ $PROJECT_ID == "" ]]; then
  PROJECT_ID=$(yq eval '.project' config.yaml)
fi

STORE_PROJECT_ID=$2
if [[ $STORE_PROJECT_ID == "" ]]; then
  STORE_PROJECT_ID=$(yq eval '.storage_project' config.yaml)
fi

NAME="website-robot"
SERVICE_ACCOUNT="$NAME@$PROJECT_ID.iam.gserviceaccount.com"

# Data store project roles
declare -a roles=(
    "roles/bigquery.admin"   # BigQuery
    "roles/bigtable.reader" # Bigtable
    "roles/storage.objectViewer" # Branch Cache Read
    "roles/pubsub.editor" # Branch Cache Subscription
)
for role in "${roles[@]}"
do
  gcloud projects add-iam-policy-binding $STORE_PROJECT_ID \
    --member serviceAccount:$SERVICE_ACCOUNT \
    --role $role
done