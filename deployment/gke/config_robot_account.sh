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

PROJECT_ID=$1
NAME="website-robot"
SERVICE_ACCOUNT="$NAME@$PROJECT_ID.iam.gserviceaccount.com"

# Query BigQuery
gcloud projects add-iam-policy-binding $(yq r ../config.yaml bind_project.bigquery) \
  --member serviceAccount:$SERVICE_ACCOUNT \
  --role roles/bigquery.user

# Query Bigtable
gcloud projects add-iam-policy-binding $(yq r ../config.yaml bind_project.bigtable) \
  --member serviceAccount:$SERVICE_ACCOUNT \
  --role roles/bigtable.reader

# Branch Cache Read
gcloud projects add-iam-policy-binding $(yq r ../config.yaml bind_project.branch_cache) \
  --member serviceAccount:$SERVICE_ACCOUNT \
  --role roles/storage.objectViewer

# Branch Cache subscription
gcloud projects add-iam-policy-binding $(yq r ../config.yaml bind_project.branch_cache) \
  --member serviceAccount:$SERVICE_ACCOUNT \
  --role roles/pubsub.editor

# Self project roles
declare -a roles=(
    "roles/endpoints.serviceAgent" # service control report for endpoints.
    "roles/storage.objectViewer" # Website resource: placeid2dcid.json, etc...
)
for role in "${roles[@]}"
do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member serviceAccount:$SERVICE_ACCOUNT \
    --role $role
done