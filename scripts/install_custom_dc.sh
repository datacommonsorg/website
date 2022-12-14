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

TERRAFORM_PATH=$(which terraform)
if [[ -n "$TERRAFORM_PATH" ]]; then
    echo "Found Terraform: ${TERRAFORM_PATH}"
else
    echo "Error: Terraform command not found."
    echo "Please follow the official guide on how to install it."
    echo "https://developer.hashicorp.com/terraform/downloads"
    exit 1
fi

GCLOUD_PATH=$(which gcloud)
if [[ -n "$GCLOUD_PATH" ]]; then
    echo "Found gcloud: ${GCLOUD_PATH}"
else
    echo "Error: gcloud command not found."
    echo "Please follow the official guide on how to install it."
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if [[ -z "$PROJECT_ID" ]]; then
    echo "Error: environment variable PROJECT_ID is required but not set." 1>&2
    echo "Please set PROJECT_ID by running the following command." 1>&2
    echo "export PROJECT_ID=<GCP project id to install the DC web application in>" 1>&2
    exit 1
fi

if [[ -z "$CONTACT_EMAIL" ]]; then
    echo "Error: environment variable CONTACT_EMAIL is required but not set." 1>&2
    echo "Please set CONTACT_EMAIL by running the following command." 1>&2
    echo "export CONTACT_EMAIL=<Email that you have access to in order to activate the domain.>" 1>&2
    exit 1
fi

if [[ -n "$CUSTOM_DC_DOMAIN" ]]; then
  echo "Custom domain name detected through the variable CUSTOM_DC_DOMAIN"
  echo "Will register $CUSTOM_DC_DOMAIN."
fi

echo "Installing Custom Datacommons web application in $PROJECT_ID."

# Clone DC website repo and mixer submodule.
git clone https://github.com/datacommonsorg/website
cd website
git submodule foreach git pull origin master
git submodule update --init --recursive

WEBSITE_ROOT=$PWD

cd $WEBSITE_ROOT/deploy/terraform-datacommons-website/examples/setup

terraform init && terraform apply \
  -var="project_id=$PROJECT_ID" \
  -var="contact_email=$CONTACT_EMAIL" \
  ${CUSTOM_DC_DOMAIN:+-var="dc_website_domain=$CUSTOM_DC_DOMAIN"} \
  -auto-approve

cd $WEBSITE_ROOT/deploy/terraform-datacommons-website/examples/website_v1

DOMAIN="$PROJECT_ID-datacommons.com"
if [[ -n "$CUSTOM_DC_DOMAIN" ]]; then
  DOMAIN=$CUSTOM_DC_DOMAIN
fi

# <project_id>-datacommons.com is the default domain name defined in setup/main.tf
terraform init && terraform apply \
  -var="project_id=$PROJECT_ID" \
  -var="dc_website_domain=$DOMAIN" -auto-approve

_success_msg="
###############################################################################
# Status: Successfully launched the installer in $PROJECT_ID.
###############################################################################

###############################################################################
# Action required:
###############################################################################
Please don't forget to email support+custom@datacommons.org with your
GCP project id for data access.

###############################################################################
# Action required:
###############################################################################
Please also make sure to click on the activation email for $DOMAIN
If the contact email has previously been used to verify domains,
then $DOMAIN will be already active without needing activation emails

To check the status of $DOMAIN, please visit the link below.
https://console.cloud.google.com/net-services/domains/registrations/list?project=$PROJECT_ID

Note:
You should expect the instance to be accessible via $DOMAIN
within 30 minutes or so after support@datacommons.org responds.
"
echo "$_success_msg"
