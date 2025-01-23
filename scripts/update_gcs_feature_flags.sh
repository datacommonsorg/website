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

# Script to upload feature flag configurations to the website GCS bucket.
# Used for updating the feature flags used in different environments.
# Will upload the specified configuration file to the corresponding
# environment's bucket.
#
# In order to update Production, you must first update staging to have the same flags you're about to rollout to Production. 
# This script can also trigger the Kubernetes pod to restart all nodes in the cluster.
#
# To Use:
#  (1) Make sure you're running from root with a clean HEAD
#  (2) Make sure you've signed into authenticated to gcloud using
#          `gcloud auth application-default login`
#  (3) Run `./scripts/update_gcs_feature_flags.sh <environment>`
#  Where <environment> is one of: dev, staging, production, autopush

# Define the valid environments
valid_environments=("dev" "staging" "production" "autopush")

# Check if an environment is provided
if [ -z "$1" ]; then
  echo "Error: Please provide an environment as an argument."
  echo "Usage: $0 <environment>"
  exit 1
fi

# Get the environment from the command line argument
environment="$1"

# Check if the provided environment is valid
if [[ ! " ${valid_environments[@]} " =~ " ${environment} " ]]; then
  echo "Error: Invalid environment '$environment'."
  exit 1
fi

# Construct the filename (e.g., dev.json, staging.json)
file="${environment}.json"

# Validate the JSON file
if ! python -m json.tool "server/config/feature_flag_configs/${file}" &> /dev/null; then
  echo "Error: ${file} is not valid JSON."
  exit 1
fi

# Construct the bucket name, handling the "prod" case for production
if [[ "$environment" == "production" ]]; then
  bucket_name="datcom-website-prod-resources"

  # Confirmation prompt for production
  read -p "Have you validated these feature flags in staging? (yes/no) " -n 1 -r
  echo    # (optional) move to a new line
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborting deployment to production."
    exit 1
  fi

  # Fetch staging flags from GCS
  echo "Fetching staging feature flags from GCS..."
  gsutil cp "gs://datcom-website-staging-resources/feature_flags.json" "staging_flags.json"

  # Compare staging and production flags
  echo "Comparing staging and production feature flags..."
  if ! diff --color "server/config/feature_flag_configs/${file}" "staging_flags.json" &> /dev/null; then
    echo "Error: Production feature flags differ from staging."
    echo "Please ensure the flags are identical before deploying to production."
    echo "Diffs:"
    diff -C 2 --color "server/config/feature_flag_configs/${file}" "staging_flags.json"
    exit 1
  fi

  rm "staging_flags.json"  # Clean up temporary file
else
  bucket_name="datcom-website-${environment}-resources"
fi

echo "Uploading ${file} to gs://${bucket_name}/feature_flags.json"
gsutil cp "server/config/feature_flag_configs/${file}" "gs://${bucket_name}/feature_flags.json"

echo "Upload complete!"

# Prompt for Kubernetes restart
read -p "Do you want to restart the Kubernetes deployment? (yes/no) " -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Use the appropriate project.
  gcloud config set project datcom-website-${environment}

  # Get the credentials for the autopush k8s cluster
  gcloud container clusters get-credentials website-us-central1 --region us-central1 --project datcom-website-${environment}

  # Restart the deployment
  kubectl rollout restart deployment website-app -n website
  echo "Kubernetes deployment restarted."
fi