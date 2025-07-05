#!/bin/bash

# clear_cache.sh

# Function to clear the cache for a specific environment configuration
clear_cache_env() {
  PROJECT_ID=$1
  CLUSTER_NAME=$2
  LOCATION=$3
  REDIS_REGION=$4 # Optional: Set REDIS_REGION if it is different from the cluster LOCATION arg

  # Exit the script if there's an error
  set -e

  echo "--- Clearing cache for Project: $PROJECT_ID, Cluster: $CLUSTER_NAME, Location: $LOCATION ---"

  gcloud config set project $PROJECT_ID

  # Set default redis region if not passed in
  if [ -z "${REDIS_REGION}" ]; then
    REDIS_REGION=$LOCATION
  fi

  # Set cluster region or zone
  if [[ $LOCATION =~ ^[a-z]+-[a-z0-9]+$ ]]; then
    REGION=$LOCATION
  else
    ZONE=$LOCATION
  fi
  gcloud container clusters get-credentials $CLUSTER_NAME \
    ${REGION:+--region=$REGION} ${ZONE:+--zone=$ZONE} --project=$PROJECT_ID

  POD_NAME=$(kubectl get pods -n website -l app=website-app -o=jsonpath='{.items[0].metadata.name}')

  if [ -z "$POD_NAME" ]; then
    echo "Error: Could not find website-app pod in namespace 'website'. Exiting."
    exit 1
  fi

  HOST=$(gcloud redis instances describe webserver-cache --region="$REDIS_REGION" --format="get(host)")

  if [ -z "$HOST" ]; then
    echo "Error: Could not find Redis instance 'webserver-cache' in region '$REDIS_REGION'. Exiting."
    exit 1
  fi

  script="import redis; redis_client = redis.StrictRedis(host=\"$HOST\", port=6379); resp = redis_client.flushall(asynchronous=True); print(\"Clearing cache for $PROJECT_ID/$CLUSTER_NAME/$LOCATION, redis host $HOST:\",resp)"
  kubectl exec -it $POD_NAME -n website -- /bin/bash -c "python -c '$script'"
  echo "--- Cache clearing complete for $PROJECT_ID ---"
}

# Main script logic
if [ -z "$1" ]; then
  echo "Usage: $0 [undata|stanford|prod|dev|staging]"
  exit 1
fi

case "$1" in
  undata)
    clear_cache_env datcom-recon-autopush datacommons-us-central1-a us-central1-a us-central1
    ;;
  stanford)
    clear_cache_env datcom-stanford website-us-central1 us-central1
    ;;
  dev)
    clear_cache_env datcom-website-dev website-us-central1 us-central1
    ;;
  staging)
    clear_cache_env datcom-website-staging website-us-central1 us-central1
    ;;
  prod)
    clear_cache_env datcom-website-prod website-us-central1 us-central1
    clear_cache_env datcom-website-prod website-us-west1 us-west1
    ;;
  *)
    echo "Invalid environment: $1"
    echo "Usage: $0 [stanford|prod|dev]"
    exit 1
    ;;
esac

exit 0