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

# Script to upload feature flag configurations to the website GCS bucket.
# Used for updating the feature flags used in different environments.
# Will upload the specified configuration file to the corresponding 
# environment's bucket.
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

# Construct the bucket name, handling the "prod" case for production
if [[ "$environment" == "production" ]]; then
  bucket_name="datcom-website-prod-resources"
else
  bucket_name="datcom-website-${environment}-resources"
fi

echo "Uploading ${file} to gs://${bucket_name}/feature_flags.json"
gsutil cp "server/config/feature_flag_configs/${file}" "gs://${bucket_name}/feature_flags.json"

echo "Upload complete!"