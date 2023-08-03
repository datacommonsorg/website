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

PROJECT_ID=$(yq eval '.project' config.yaml)
STORE_PROJECT_ID=$(yq eval '.storage_project' config.yaml)

NAME="website-robot"
SERVICE_ACCOUNT="$NAME@$PROJECT_ID.iam.gserviceaccount.com"

declare -a roles=(
    "roles/endpoints.serviceAgent" # service control report for endpoints.
    "roles/logging.logWriter" # Logging and monitoring
    "roles/monitoring.metricWriter"
    "roles/stackdriver.resourceMetadata.writer"
    "roles/compute.networkViewer"
    "roles/cloudtrace.agent"
    "roles/bigquery.jobUser"   # Query BigQuery
    "roles/pubsub.editor" # TMCF + CSV GCS data change subscription
    "roles/secretmanager.secretAccessor"
)
for role in "${roles[@]}"
do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member serviceAccount:$SERVICE_ACCOUNT \
    --role $role
done