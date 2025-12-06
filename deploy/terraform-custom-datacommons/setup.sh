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

# One-time setup script for configuring a GCP project to run Data Commons
#  * Enables required APIs

# This script requires a single argument: the GCP project ID.
source "$(dirname "$0")/../../utils.sh"
set -e

# Check if the GCP project ID is provided
if [ -z "$1" ]; then
    log_error "Error: GCP project ID is required."
    log_error "Usage: $0 <gcp-project-id>"
    exit 1
fi

# First argument is the GCP project
PROJECT_ID=$1

# Get the default service account
log_notice "Configuring GCP project ID: $PROJECT_ID"
PROJECT_NUM=$(gcloud projects list --filter="$(gcloud config get-value project)" --format="value(PROJECT_NUMBER)")
SERVICE_ACCOUNT="$PROJECT_NUM-compute@developer.gserviceaccount.com"
log_notice "Service account: $SERVICE_ACCOUNT"

gcloud config set project $PROJECT_ID

# Enable APIs
REQUIRED_APIS=(
    "compute.googleapis.com"              # For Compute Engine and VPC networking
    "redis.googleapis.com"                # For Google Cloud Memorystore (Redis)
    "sqladmin.googleapis.com"             # For Cloud SQL
    "storage.googleapis.com"              # For Google Cloud Storage
    "run.googleapis.com"                  # For Cloud Run
    "vpcaccess.googleapis.com"            # For VPC Access for Cloud Run
    "iam.googleapis.com"                  # For IAM roles and service accounts
    "cloudresourcemanager.googleapis.com" # For IAM roles and service accounts
    "secretmanager.googleapis.com"        # For creating secrets
    "apikeys.googleapis.com"              # For creating api keys
)
# Enable each API
for api in "${REQUIRED_APIS[@]}"; do
    log_notice "Enabling API: $api"
    gcloud services enable $api --project $PROJECT_ID
done
log_success "All required APIs have been enabled for project $PROJECT_ID."
