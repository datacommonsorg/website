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

# This script clears the Redis cache for a specified target (website or mixer) and environment.
#
# Usage:
#   run.sh <TARGET> <ENVIRONMENT>
#
#   - TARGET: The target to clear cache for ('website' or 'mixer').
#   - ENVIRONMENT: The environment to clear ('dev', 'staging', 'prod', 'autopush').

set -e

# Function to clear the website cache
clear_website_cache() {
  local PROJECT_ID=$1
  local CLUSTER_NAME=$2
  local LOCATION=$3
  local REDIS_REGION=${4:-$LOCATION}

  echo "--- Clearing website cache for Project: $PROJECT_ID, Cluster: $CLUSTER_NAME, Location: $LOCATION ---"
  gcloud config set project "$PROJECT_ID"
  gcloud container clusters get-credentials "$CLUSTER_NAME" --location="$LOCATION" --project="$PROJECT_ID"

  local POD_NAME
  POD_NAME=$(kubectl get pods -n website -l app=website-app -o=jsonpath='{.items[0].metadata.name}')
  if [ -z "$POD_NAME" ]; then
    echo "Error: Could not find website-app pod in namespace 'website'. Exiting."
    return 1
  fi

  local HOST
  HOST=$(gcloud redis instances describe webserver-cache --region="$REDIS_REGION" --format="get(host)")
  if [ -z "$HOST" ]; then
    echo "Error: Could not find Redis instance 'webserver-cache' in region '$REDIS_REGION'. Exiting."
    return 1
  fi

  local script="import redis; redis_client = redis.StrictRedis(host=\"$HOST\", port=6379); resp = redis_client.flushall(asynchronous=True); print(\"Clearing cache for $PROJECT_ID/$CLUSTER_NAME/$LOCATION, redis host $HOST:\",resp)"
  kubectl exec -it "$POD_NAME" -n website -- /bin/bash -c "python -c '$script'"
  echo "--- Website cache clearing complete for $PROJECT_ID ---"
}

# Function to clear the mixer cache
clear_mixer_cache() {
  local PROJECT_ID=$1
  local CLUSTER_NAME=$2
  local LOCATION=$3
  local REDIS_REGION=${4:-$LOCATION}

  echo "--- Clearing mixer cache for Project: $PROJECT_ID, Cluster: $CLUSTER_NAME, Location: $LOCATION ---"
  gcloud config set project "$PROJECT_ID"
  gcloud container clusters get-credentials "$CLUSTER_NAME" --location="$LOCATION" --project="$PROJECT_ID"

  local POD_NAME
  POD_NAME=$(kubectl get pods -n mixer -o=jsonpath='{.items[0].metadata.name}')
  if [ -z "$POD_NAME" ]; then
    echo "Error: Could not find mixer pod in namespace 'mixer'. Exiting."
    return 1
  fi

  local HOST
  HOST=$(gcloud redis instances describe mixer-cache --region="$REDIS_REGION" --format="get(host)")
  if [ -z "$HOST" ]; then
    echo "Error: Could not find Redis instance 'mixer-cache' in region '$REDIS_REGION'. Exiting."
    return 1
  fi

  echo "Clearing Redis cache for $PROJECT_ID/$CLUSTER_NAME/$LOCATION, redis host: $HOST, using pod: $POD_NAME"
  kubectl exec -it "$POD_NAME" -n mixer -- /bin/bash -c "/go/bin/tools/clearcache --redis_host=$HOST"
  echo "--- Mixer cache clearing complete for $PROJECT_ID ---"
}

TARGET=$1
ENVIRONMENT=$2

if [ -z "$TARGET" ] || [ -z "$ENVIRONMENT" ]; then
  echo "Usage: $0 <TARGET> <ENVIRONMENT>"
  echo "  TARGET: 'website' or 'mixer'"
  echo "  ENVIRONMENT: 'dev', 'staging', 'prod', or 'autopush'"
  exit 1
fi

case "$TARGET" in
  website)
    case "$ENVIRONMENT" in
      dev)
        clear_website_cache "datcom-website-dev" "website-us-central1" "us-central1"
        ;;
      staging)
        clear_website_cache "datcom-website-staging" "website-us-central1" "us-central1"
        ;;
      prod)
        clear_website_cache "datcom-website-prod" "website-us-central1" "us-central1"
        clear_website_cache "datcom-website-prod" "website-us-west1" "us-west1"
        ;;
      autopush)
        clear_website_cache "datcom-website-autopush" "website-us-central1" "us-central1"
        ;;
      *)
        echo "Invalid environment for website: $ENVIRONMENT"
        exit 1
        ;;
    esac
    ;;
  mixer)
    case "$ENVIRONMENT" in
      dev)
        clear_mixer_cache "datcom-mixer-dev" "mixer-us-central1" "us-central1"
        ;;
      staging)
        clear_mixer_cache "datcom-mixer-staging" "mixer-us-central1" "us-central1"
        ;;
      prod)
        clear_mixer_cache "datcom-mixer" "mixer-us-central1" "us-central1"
        ;;
      autopush)
        clear_mixer_cache "datcom-mixer-autopush" "mixer-us-central1" "us-central1"
        ;;
      *)
        echo "Invalid environment for mixer: $ENVIRONMENT"
        exit 1
        ;;
    esac
    ;;
  *)
    echo "Invalid target: $TARGET"
    echo "Usage: $0 <TARGET> <ENVIRONMENT>"
    exit 1
    ;;
esac

exit 0
