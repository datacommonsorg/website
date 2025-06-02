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
#  (3) Run `./scripts/update_gcs_feature_flags.sh <environment> <skipStagingPrompt> <shouldRestart>`
#  Where <environment> is one of: dev, staging, production, autopush
#        <skipStagingPrompt> specifies whether we should skip prompting the user for a staging check.
#        <shouldRestart> specifies whether to restart the Kubernetes cluster.
#  The last two parameters are optional, but if ommitted, the caller will be prompted for an answer. 
#  For programmatic callouts to this script (i.e. from Cloud Build), don't forget these parameters!

# Helper functions

# Function to check if an environment is valid
is_valid_environment() {
  local environment="$1"
  local valid_environments=("dev" "staging" "production" "autopush")
  [[ ! " ${valid_environments[@]} " =~ " ${environment} " ]] && return 1 || return 0
}

# Function to find the correct Python executable
find_python() {
  if command -v python3 &> /dev/null; then
    echo "python3"
  elif command -v python &> /dev/null; then
    echo "python"
  else
    echo "Error: Python not found!"
    exit 1
  fi
}

# Function to download a file from GitHub
download_from_github() {
  local file="$1"
  local temp_file="$2"
  local github_base_url="https://raw.githubusercontent.com/Datacommonsorg/website/master/server/config/feature_flag_configs"

  echo "Downloading ${file} from GitHub..."
  curl -sL "${github_base_url}/${file}" -o "${temp_file}"  # Added -L for redirects

  if [[ $? -ne 0 ]]; then
    echo "Error: Failed to download ${file} from GitHub. curl exited with code $?."
    curl -v "${github_base_url}/${file}" >&2 #Verbose curl output for debugging
    return 1
  fi
  return 0
}

# Function to validate a JSON file
validate_json() {
  local file="$1"
  local python_executable=$(find_python) # Use the find_python function
  if ! $python_executable -m json.tool "${file}" &> /dev/null; then
    echo "Error: ${file} is not valid JSON."
    return 1
  fi
  return 0
}

# Function to get the bucket name
get_bucket_name() {
  local environment="$1"
  if [[ "$environment" == "production" ]]; then
    echo "datcom-website-prod-resources"
  else
    echo "datcom-website-${environment}-resources"
  fi
}

# Function to compare staging and production flags
compare_staging_production() {
    local temp_file="$1"
    local staging_file="staging_flags.json"
    local github_base_url="https://raw.githubusercontent.com/Datacommonsorg/website/master/server/config/feature_flag_configs"
    
    echo "Fetching staging feature flags from GCS and Github..."
    gsutil cp "gs://datcom-website-staging-resources/feature_flags.json" "${staging_file}"
    curl -sL "${github_base_url}/staging.json" -o "staging_from_github.json"

    if [[ $? -ne 0 ]]; then
        echo "Error: Failed to download staging.json from GitHub."
        return 1
    fi

    local python_executable=$(find_python)

    # Python script to identify if flags enabled in production are disabled in staging.
    if "$python_executable" -c "
import json
import sys

try:
    with open('$staging_file', 'r') as f1, open('$temp_file', 'r') as f2:
        staging_data = json.load(f1)
        production_data = json.load(f2)

    staging_enabled = {f['name'] for f in staging_data if f.get('enabled')}
    production_enabled = {f['name'] for f in production_data if f.get('enabled')}

    production_only_enabled = production_enabled - staging_enabled

    if production_only_enabled:
        print('Error: Production feature flags have enabled flags that are disabled or missing in staging.')
        print('Please ensure that all enabled flags in production are also enabled in staging.')
        print('See the following flags that must first be enabled in staging:', sorted(list(production_only_enabled)))
        sys.exit(1)
    else:
        print('Success comparing production and staging flags.')
        sys.exit(0)

except FileNotFoundError:
    print('Error: File not found.', file=sys.stderr)
    sys.exit(1)
except json.JSONDecodeError:
    print('Error: Invalid JSON.', file=sys.stderr)
    sys.exit(1)
" ; then
        rm "${staging_file}"
        rm "staging_from_github.json"
        return 1
    fi
    rm "${staging_file}"
    rm "staging_from_github.json"
    return 0
}

# Function to restart the Kubernetes deployment
restart_kubernetes_deployment() {
  local environment="$1"

  # Sanitize environment input:  Change "production" to "prod"
  if [[ "$environment" == "production" ]]; then
    environment="prod"
  fi

  gcloud config set project "datcom-website-${environment}"

  if [[ "$environment" == "prod" ]]; then
    gcloud container clusters get-credentials website-us-west1 --region us-west1 --project "datcom-website-${environment}"
    kubectl rollout restart deployment website-app -n website
    echo "Kubernetes deployment restarted in environment: ${environment}, region: us-west1."
  fi

  gcloud container clusters get-credentials website-us-central1 --region us-central1 --project "datcom-website-${environment}"
  kubectl rollout restart deployment website-app -n website
  echo "Kubernetes deployment restarted in environment: ${environment}, region: us-central1."
}

# Main script

# Check for environment argument
if [ -z "$1" ]; then
  echo "Error: Please provide an environment as an argument."
  echo "Usage: $0 <environment>"
  exit 1
fi

environment="$1"
skip_staging_prompt="$2"
should_restart="$3"

# Validate the environment
if ! is_valid_environment "$environment"; then
  echo "Error: Invalid environment '$environment'."
  exit 1
fi

file="${environment}.json"
temp_file="./temp.json"

# Download and validate the file
if ! download_from_github "$file" "$temp_file"; then
  exit 1
fi

if ! validate_json "$temp_file"; then
  echo "EXITING!"
  exit 1
fi

bucket_name=$(get_bucket_name "$environment")

if [[ "$environment" == "production" ]]; then
    if [[ -z "$skip_staging_prompt" || "$skip_staging_prompt" != "true" ]]; then
        read -p "Have you validated these feature flags in staging? (yes/no) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Aborting deployment to production."
            exit 1
        fi
    fi

    if compare_staging_production "$temp_file"; then
        exit 1
    fi
fi


echo "Uploading ${file} to gs://${bucket_name}/feature_flags.json"
gsutil cp "${temp_file}" "gs://${bucket_name}/feature_flags.json"

echo "Upload complete!"

# Kubernetes restart prompt
if [[ -n "$should_restart" ]]; then
  if [[ "$should_restart" == "true" ]]; then
    restart_kubernetes_deployment "$environment"
  fi
else
  read -p "Do you want to restart the Kubernetes deployment? (yes/no) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    restart_kubernetes_deployment "$environment"
  fi
fi

rm "${temp_file}"