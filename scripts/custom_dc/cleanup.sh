#!/bin/bash
# Copyright 2023 Google LLC
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
#
# This script cleans up all resources in a Custom DC GCP project.
# Usage: ./scripts/custom_dc/cleanup.sh <project id>
set -e

PROJECT_ID=$1
if [[ $PROJECT_ID == "" ]]; then
  echo "PROJECT_ID environment variable is required."
  exit 1
fi

WEBSITE_ROOT=$PWD

if [[ -n "$DOMAIN" ]]; then
  echo "DOMAIN environment variable is required."
  exit 1
fi

TF_STATE_BUCKET=$PROJECT_ID-terraform-state

# TODO(alex): Delete BT automation resources.

# Delete everything managed by website_v1
cd $WEBSITE_ROOT/deploy/terraform-datacommons-website/examples/website_v1

terraform init \
  -backend-config="bucket=$TF_STATE_BUCKET" \
  -backend-config="prefix=website_v1"

# Remove helm state in legacy instances
if $(terraform state list | grep module.k8s_resources); then
    echo "Found Terraform state for legacy helm resource, deleting."
    terraform state rm module.k8s_resources
fi

terraform destroy \
  -var="project_id=$PROJECT_ID" \
  -var="dc_website_domain=$DOMAIN" \
  -var="mixer_githash=9c7a2bd" \
  -auto-approve

# Cleanup local terraform dir
rm -rf .terraform

# Delete all objects without resource bucket
# Terraform cannot delete non-empty buckets.
gsutil -m rm -a gs://$PROJECT_ID-resources/** || echo "Resource bucket is empty."

# Delete everything managed by setup module.
cd $WEBSITE_ROOT/deploy/terraform-datacommons-website/examples/setup

terraform init \
  -backend-config="bucket=$TF_STATE_BUCKET" \
  -backend-config="prefix=setup"

# TODO(alex): add support for deleting setiups with custom domain
terraform destroy \
  -var="project_id=$PROJECT_ID" \
  -auto-approve

# Cleanup local terraform dir
rm -rf .terraform

echo "Cleanup finished."