#!/bin/bash
# Copyright 2023 Google LLC
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

PROJECT_ID=$1
CLUSTER_NAME=$2
LOCATION=$3
# Optional: Set REDIS_REGION if it is different from the cluster LOCATION arg
REDIS_REGION=$4

# Exit the script if there's an error
set -e

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
HOST=$(gcloud redis instances describe webserver-cache --region="$REDIS_REGION" --format="get(host)")
script="import redis; redis_client = redis.StrictRedis(host=\"$HOST\", port=6379); resp = redis_client.flushall(asynchronous=True); print(\"Clearing cache for host $PROJECT_ID/$CLUSTER_NAME/$LOCATION, redis host $HOST:\",resp)"
kubectl exec -it $POD_NAME -n website -- /bin/bash -c "python -c '$script'"
