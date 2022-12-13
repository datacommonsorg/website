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

if [[ -z "${PROJECT_ID}" ]]; then
    echo "Error: environment variable PROJECT_ID is required but not set." 1>&2
    echo "Please set PROJECT_ID by running the following command." 1>&2
    echo "export PROJECT_ID=<GCP project id to install the DC web application in>" 1>&2
    exit 1
fi

if [[ -z "${CONTACT_EMAIL}" ]]; then
    echo "Error: environment variable CONTACT_EMAIL is required but not set." 1>&2
    echo "Please set CONTACT_EMAIL by running the following command." 1>&2
    echo "export CONTACT_EMAIL=<Email that you have access to in order to activate the domain.>" 1>&2
    exit 1
fi

echo "Installing Custom Datacommons web application in $PROJECT_ID."

# Clone DC website repo and mixer submodule.
git clone https://github.com/datacommonsorg/website
git submodule foreach git pull origin master
git submodule update --init --recursive

cd website/deploy/terraform-datacommons-website/examples/setup

terraform init && terraform apply \
  -var="project_id=$PROJECT_ID" \
  -var="contact_email=$CONTACT_EMAIL" -auto-approve

cd ../website_V1

# <project_id>-datacommons.com is the default domain name defined in setup/main.tf
terraform init && terraform apply \
  -var="project_id=$PROJECT_ID" \
  -var="dc_website_domain=$PROJECT_ID-datacommons.com" -auto-approve

echo "The setup step has completed successfully."
echo "Please don't forget to email custom-datacommons-support@google.com for data access."
echo "Please also make sure to click on the activation email for the newly created domain."