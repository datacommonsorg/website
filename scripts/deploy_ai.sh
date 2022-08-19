#!/bin/bash
# Copyright 2022 Google LLC
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

ENV=$1
REGION=$2

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$(dirname "$DIR")"

if [[ $REGION == "" ]]; then
  REGION=$(yq eval '.region.primary' $ROOT/deploy/gke/$ENV.yaml)
fi

echo "Using $ROOT/deploy/gke/$ENV.yaml"

PROJECT_ID=$(yq eval '.project' $ROOT/deploy/gke/$ENV.yaml)
PROJECT_NUMBER=$(gcloud projects list --filter="${PROJECT_ID}" --format="value(PROJECT_NUMBER)")

MODEL_NAME=$(yq eval '.model_name' $ROOT/deploy/gke/$ENV.yaml)
MODEL_BUCKET=$(yq eval '.model_bucket' $ROOT/deploy/gke/$ENV.yaml)

NETWORK_NAME="default"
MODEL_PATH="${MODEL_BUCKET}/${MODEL_NAME}"

if ! gsutil -q stat "${MODEL_PATH}/*" ; then
  echo "Model path does not exists ${MODEL_PATH}."
  exit
fi

echo "Setting up Vertex AI model for ${MODEL_PATH}"

MACHINE_TYPE="n1-highmem-2"
VERTEX_MODEL_NAME="vxm-${MODEL_NAME}"
VERTEX_ENDPOINT_NAME="vxe-${MODEL_NAME}"

gcloud ai models upload \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --display-name="${VERTEX_MODEL_NAME}" \
    --artifact-uri="${MODEL_PATH}" \
    --container-image-uri="us-docker.pkg.dev/vertex-ai-restricted/prediction/tensorflow-enterprise-inference-engine-alpha:latest" \
    --container-args='--port=8500,--rest_api_port=8080,--model_name=default,--model_base_path=$(AIP_STORAGE_URI)' \
    --container-ports=8080 \
    --container-predict-route=/v1/models/default:predict \
    --container-health-route=/v1/models/default

gcloud beta ai endpoints create \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --network="projects/${PROJECT_NUMBER}/global/networks/${NETWORK_NAME}" \
    --display-name="${VERTEX_ENDPOINT_NAME}"

ENDPOINT_ID=$(gcloud beta ai endpoints list --project="${PROJECT_ID}" --region="${REGION}" --filter "display_name=${VERTEX_ENDPOINT_NAME}" --format="value(ENDPOINT_ID.scope())")
MODEL_ID=$(gcloud beta ai models list --project="${PROJECT_ID}" --region="${REGION}" --filter "display_name=${VERTEX_MODEL_NAME}" --format="value(MODEL_ID.scope())")

gcloud beta ai endpoints deploy-model "${ENDPOINT_ID}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --model="${MODEL_ID}" \
    --display-name="${MODEL_NAME}" \
    --machine-type="${MACHINE_TYPE}" \
    --accelerator="count=1,type=nvidia-tesla-t4"

# Extract model id from an URL like:  http://ENDPOINT_ID.aiplatform.googleapis.com/v1/models/DEPLOYED_MODEL_ID:predict
DEPLOYED_MODEL_ID=$(gcloud beta ai endpoints describe ${ENDPOINT_ID} --project="${PROJECT_ID}" --region="${REGION}" --format="value(deployedModels.privateEndpoints.predictHttpUri)" | sed -e 's|.*models/\(.*\):predict|\1|g')

YAML_FILE=$(cat << EOF
${REGION}:
  protocol: rest
  endpoint_id: "${ENDPOINT_ID}"
  deployed_model_id: "${DEPLOYED_MODEL_ID}"
EOF
)

echo "You can use the following ai.yaml file:"
echo "--------------------------------------------------"
echo "${YAML_FILE}"
echo "--------------------------------------------------"