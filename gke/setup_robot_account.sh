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
TMCF_CSV_BUCKET=$(yq eval '.tmcf_csv_bucket' config.yaml)
GCS_BUCKET=$(yq eval '.gcs_bucket' config.yaml)


NAME="website-robot"
SERVICE_ACCOUNT="$NAME@$PROJECT_ID.iam.gserviceaccount.com"

# Data store project roles
declare -a roles=(
    "roles/bigquery.admin"   # Query BigQuery
    "roles/bigtable.reader" # Query Bigtable
    "roles/storage.objectViewer" # Branch Cache Read
    "roles/pubsub.editor" # Branch Cache subscription
)
for role in "${roles[@]}"
do
  gcloud projects add-iam-policy-binding $STORE_PROJECT_ID \
    --member serviceAccount:$SERVICE_ACCOUNT \
    --role $role
done

# Self project roles
declare -a roles=(
   # service control report for endpoints.
    "roles/endpoints.serviceAgent"
    # Website resource: placeid2dcid.json, etc...
    "roles/storage.objectViewer"
    "roles/storage.legacyBucketReader"
    # Secret manager accessor
    "roles/secretmanager.secretAccessor"
    # Logging and monitoring
    "roles/logging.logWriter"
    "roles/monitoring.metricWriter"
    "roles/stackdriver.resourceMetadata.writer"
    "roles/compute.networkViewer"
    "roles/cloudtrace.agent"
    "roles/bigquery.jobUser"   # Query BigQuery
    "roles/pubsub.editor" # Private DC data change subscription
)
for role in "${roles[@]}"
do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member serviceAccount:$SERVICE_ACCOUNT \
    --role $role
done

gsutil iam ch serviceAccount:$SERVICE_ACCOUNT:roles/storage.legacyBucketReader gs://$GCS_BUCKET

if [[ $TMCF_CSV_BUCKET != 'null' ]]; then
  gsutil iam ch serviceAccount:$SERVICE_ACCOUNT:roles/storage.objectViewer gs://$TMCF_CSV_BUCKET
fi