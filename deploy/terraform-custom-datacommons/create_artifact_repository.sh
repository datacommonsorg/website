#!/bin/bash
# Copyright 2025 Google LLC
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

# One-time setup script for creating a GCR artifact repository

# Takes two arguments: the GCP project ID and optionally the region.
source "$(dirname "$0")/../../scripts/utils.sh"
set -e

# Check if the GCP project ID is provided
if [ -z "$1" ]; then
    log_error "Error: GCP project ID is required."
    log_error "Usage: $0 <gcp-project-id>"
    exit 1
fi

# First argument is the GCP project
PROJECT_ID=$1

# Check if region is provided, otherwise default to us-central1
if [ -z "$2" ]; then
    REGION="us-central1"
else
    REGION="$2"
fi

# Validate region format
if ! [[ $REGION =~ ^[a-z]+-[a-z0-9]+$ ]]; then
    log_error "Error: Invalid region format."
    log_error "Region should be in format like 'us-central1'"
    exit 1
fi


# Enable the Artifact Registry API
gcloud services enable artifactregistry.googleapis.com --project $PROJECT_ID

# Create the artifact repository
gcloud artifacts repositories create $PROJECT_ID-artifacts \
  --repository-format=docker \
  --location=$REGION \
  --description="Artifact repository for $PROJECT_ID"

log_success "Artifact repository created successfully."
