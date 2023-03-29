#!/bin/bash
# Copyright 2019 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


# Script to deploy website to a GKE cluster.
#
# Usage:
#
# !!! WARNING: Run this script in a clean HEAD on master.
#

set -e

function help {
  echo "Usage: $0 -erpht"
  echo "-e       Instance environment as defined under /deploy/gke"
  echo "-r       GCP region Default: us-central1"
  echo "-p       GCP project to deploy the project to, when specified, docker image is also read from this project"
  echo "-h       Website hash used for deployment"
  echo "-t       Comma separated list of custom BigTable names."
  exit 1
}

PROJECT_ID=""
ENV=""

while getopts ":e:r:p:h:t:" OPTION; do
  case $OPTION in
    e)
      ENV=$OPTARG
      ;;
    r)
      REGION=$OPTARG
      ;;
    p)
      PROJECT_ID=$OPTARG
      ;;
    h)
      WEBSITE_HASH=$OPTARG
      ;;
    t)
      CUSTOM_BT_CSV=$OPTARG
      ;;
    *)
      help
      ;;
  esac
done

if [[ $ENV == "" && $PROJECT_ID == "" ]];then
  echo "Set environment by -e, or set project id by -p"
  exit 1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$(dirname "$DIR")"

if [[ $REGION == "" ]]; then
  REGION="us-central1"
fi

cd $ROOT
if [[ $WEBSITE_HASH == "" ]]; then
  WEBSITE_HASH=$(git rev-parse --short=7 HEAD)
fi

cd $ROOT/mixer
MIXER_HASH=$(git rev-parse --short=7 HEAD)

cd $ROOT/deploy/git
echo $WEBSITE_HASH > website_hash.txt
echo $MIXER_HASH > mixer_hash.txt

cd $ROOT
if [[ $PROJECT_ID != "" ]]; then
  # This is a pure custom project hosted and deployed by third party
  CLUSTER_PREFIX=datacommons
  IMAGE_PROJECT=$PROJECT_ID
  cd $ROOT/deploy/overlays
  cp custom_kustomization.yaml.tpl kustomization.yaml
  sed -i '' "s/<PROJECT_ID>/$PROJECT_ID/g" kustomization.yaml
  export PROJECT_ID=$PROJECT_ID
  yq eval -i '.project = env(PROJECT_ID)' ../base/custom_bigtable_info.yaml
  yq eval -i '.instance = "dc-graph"' ../base/custom_bigtable_info.yaml
  yq eval -i 'del(.tables)' ../base/custom_bigtable_info.yaml
  yq eval -i '.tables = []' ../base/custom_bigtable_info.yaml
  IFS=","
  for TABLE in $CUSTOM_BT_CSV
  do
    echo "Adding custom BigTable: $TABLE"
    export TABLE=$TABLE
    yq eval -i '.tables += [ env(TABLE) ]' ../base/custom_bigtable_info.yaml
  done
else
  PROJECT_ID=$(yq eval '.project' $ROOT/deploy/gke/$ENV.yaml)
  CLUSTER_PREFIX=$(yq eval '.cluster_prefix' $ROOT/deploy/gke/$ENV.yaml)
  if [[ $CLUSTER_PREFIX == "null" ]]; then
    CLUSTER_PREFIX="website"
  fi
  IMAGE_PROJECT=datcom-ci
  cd $ROOT/deploy/overlays/$ENV
fi
CLUSTER_NAME=$CLUSTER_PREFIX-$REGION

# Deploy to GKE
kustomize edit set image gcr.io/datcom-ci/datacommons-website=gcr.io/$IMAGE_PROJECT/datacommons-website:$WEBSITE_HASH
kustomize edit set image gcr.io/datcom-ci/datacommons-nl=gcr.io/$IMAGE_PROJECT/datacommons-nl:$WEBSITE_HASH
kustomize edit set image gcr.io/datcom-ci/datacommons-mixer=gcr.io/datcom-ci/datacommons-mixer:$MIXER_HASH
kustomize build > kustomize-build.yaml
cp kustomization.yaml kustomize-deployed.yaml
gcloud config set project $PROJECT_ID
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION
kubectl apply -f kustomize-build.yaml

Deploy Cloud Endpoints
export SERVICE_NAME="website-esp.endpoints.$PROJECT_ID.cloud.goog"
export API_TITLE=$SERVICE_NAME
cp $ROOT/gke/endpoints.yaml.tpl endpoints.yaml
yq eval -i '.name = env(SERVICE_NAME)' endpoints.yaml
yq eval -i '.title = env(API_TITLE)' endpoints.yaml

Deploy ESP configuration
gsutil cp gs://datcom-mixer-grpc/mixer-grpc/mixer-grpc.$MIXER_HASH.pb .
gcloud endpoints services deploy mixer-grpc.$MIXER_HASH.pb endpoints.yaml --project $PROJECT_ID

# Reset changed file
git checkout HEAD -- kustomization.yaml
cd $ROOT
git checkout HEAD -- deploy/git/mixer_hash.txt
git checkout HEAD -- deploy/git/website_hash.txt
git checkout HEAD -- deploy/base/custom_bigtable_info.yaml
