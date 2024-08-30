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

set -e

function help {
  echo "Usage: $0 -el"
  echo "-e       Instance environment as defined under ../deploy/helm_charts/envs"
  echo "-l       GKE region Default: us-central1"
  exit 1
}

while getopts ":e:l:" OPTION; do
  case $OPTION in
    e)
      ENV=$OPTARG
      ;;
    l)
      LOCATION=$OPTARG
      ;;
    *)
      help
      ;;
  esac
done

if [[ $ENV == "" ]]; then
  echo "Set environment by -e"
  exit 1
fi

PROJECT_ID=$(yq eval '.project' ../deploy/helm_charts/envs/$ENV.yaml)
CLUSTER_PREFIX=$(yq eval '.cluster_prefix' ../deploy/helm_charts/envs/$ENV.yaml)

if [[ $LOCATION == "" ]]; then
  LOCATION="us-central1"
fi

gcloud config set project $PROJECT_ID

# Get gke credentials
CLUSTER_NAME=$CLUSTER_PREFIX-$LOCATION
gcloud container clusters get-credentials $CLUSTER_NAME \
  --region=$LOCATION --project=$PROJECT_ID

# Update the cronjob config.
cp cron_testing_job.yaml.tpl cron_testing_job.yaml
yq eval -i '.spec.jobTemplate.spec.template.spec.containers[0].env += [{"name": "TESTING_ENV", "value": "'"$ENV"'"}]' cron_testing_job.yaml
export SERVICE_ACCOUNT_NAME=$(yq eval '.serviceAccount.name' ../deploy/helm_charts/envs/$ENV.yaml)
export NODE_POOL=$(yq eval '.cronTesting.nodePool' ../deploy/helm_charts/envs/$ENV.yaml)
export SCHEDULE=$(yq eval '.cronTesting.schedule' ../deploy/helm_charts/envs/$ENV.yaml)
yq eval -i '.spec.jobTemplate.spec.template.spec.serviceAccountName = env(SERVICE_ACCOUNT_NAME)' cron_testing_job.yaml
yq eval -i '.spec.jobTemplate.spec.template.spec.nodeSelector."cloud.google.com/gke-nodepool" = env(NODE_POOL)' cron_testing_job.yaml
yq eval -i '.spec.schedule = strenv(SCHEDULE)' cron_testing_job.yaml

# Apply config
kubectl apply -f cron_testing_job.yaml
