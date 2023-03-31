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

CUSTOM_DC_RELEASE_TAG=custom-dc-v0.3.0

# In some environments (such as Cloud Shell), IPv6 is not enabled on the OS.
# This causes problems during terraform runs. Fix is from the issue below.
# For more context, see https://github.com/hashicorp/terraform-provider-google/issues/6782
sudo chmod a+w /etc/hosts
export APIS="googleapis.com www.googleapis.com storage.googleapis.com iam.googleapis.com container.googleapis.com cloudresourcemanager.googleapis.com"
for i in $APIS
do
    echo "199.36.153.10 $i" >> /etc/hosts
done

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

if [ -n "$REGISTER_DOMAIN" ] && [ -z "$CONTACT_EMAIL" ]; then
    echo "Error: environment variable CONTACT_EMAIL is required but not set." 1>&2
    echo "Please set CONTACT_EMAIL by running the following command." 1>&2
    echo "export CONTACT_EMAIL=<Email that you have access to in order to activate the domain.>" 1>&2
    exit 1
fi

if [ -z "$REGISTER_DOMAIN" ] && [ -z "$CUSTOM_DC_DOMAIN" ]; then
  echo "Error: environment variable CUSTOM_DC_DOMAIN is required because default domain is not used." 1>&2
  echo "Default domain is not used because environment variable REGISTER_DOMAIN is not set."  1>&2
  echo "export CUSTOM_DC_DOMAIN=<Domain that you own> if you intend to use a domain that you own." 1>&2
  exit 1
fi

if [[ -n "$CUSTOM_DC_DOMAIN" ]]; then
  echo "Custom domain name detected through the variable CUSTOM_DC_DOMAIN"
  echo "Will register $CUSTOM_DC_DOMAIN."
fi

echo "Installing Custom Datacommons web application in $PROJECT_ID."

# Create a Terraform state bucket if it does not exist already
TF_STATE_BUCKET=$PROJECT_ID-terraform-state
gsutil ls -b -p $PROJECT_ID gs://$TF_STATE_BUCKET || gsutil mb -l us-central1 -p $PROJECT_ID gs://$TF_STATE_BUCKET

ROOT=$PWD

# Clone DC website repo and mixer submodule.
rm -rf website
git clone https://github.com/datacommonsorg/website --branch $CUSTOM_DC_RELEASE_TAG --single-branch

cd website
WEBSITE_GITHASH=$(git rev-parse --short=7 HEAD)

# Always force Mixer submodule to be cloned.
rm -rf mixer
git submodule foreach git pull origin master
git submodule update --init --recursive

WEBSITE_ROOT=$PWD

cd mixer
MIXER_GITHASH=$(git rev-parse --short=7 HEAD)

cd $WEBSITE_ROOT/deploy/terraform-datacommons-website/examples/setup

terraform init \
  -backend-config="bucket=$TF_STATE_BUCKET" \
  -backend-config="prefix=setup"

terraform apply \
  -var="project_id=$PROJECT_ID" \
  ${REGISTER_DOMAIN:+-var="contact_email=$CONTACT_EMAIL"} \
  ${REGISTER_DOMAIN:+-var="register_domain=true"} \
  ${CUSTOM_DC_DOMAIN:+-var="dc_website_domain=$CUSTOM_DC_DOMAIN"} \
  -auto-approve

cd $WEBSITE_ROOT/deploy/terraform-datacommons-website/examples/website_v1

DOMAIN="$PROJECT_ID-datacommons.com"
if [[ -n "$CUSTOM_DC_DOMAIN" ]]; then
  DOMAIN=$CUSTOM_DC_DOMAIN
fi

terraform init \
  -backend-config="bucket=$TF_STATE_BUCKET" \
  -backend-config="prefix=website_v1"

gsutil cp \
  gs://datcom-mixer-grpc/mixer-grpc/mixer-grpc.$MIXER_GITHASH.pb \
  $WEBSITE_ROOT/deploy/terraform-datacommons-website/modules/esp/mixer-grpc.$MIXER_GITHASH.pb

# <project_id>-datacommons.com is the default domain name defined in setup/main.tf
terraform apply \
  -var="project_id=$PROJECT_ID" \
  -var="dc_website_domain=$DOMAIN" \
  -var="website_githash=$WEBSITE_GITHASH" \
  -var="mixer_githash=$MIXER_GITHASH" \
  -auto-approve

# Install k8s resources using helm.
CLUSTER_LOCATION=$(terraform output --raw cluster_location)
if [[ $CLUSTER_LOCATION =~ ^[a-z]+-[a-z0-9]+$ ]]; then
  REGION=$CLUSTER_LOCATION
else
  ZONE=$CLUSTER_LOCATION
fi
gcloud container clusters get-credentials $(terraform output --raw cluster_name) \
  ${REGION:+--region $REGION} ${ZONE:+--zone $ZONE}  \
  --project $PROJECT_ID || true

cd $WEBSITE_ROOT

if [[ -n "$WEBSITE_IMAGE_PROJECT_ID" ]]; then
  echo "WEBSITE_IMAGE_PROJECT_ID is not set, using default: datcom-ci"
  WEBSITE_IMAGE_PROJECT_ID="datcom-ci"
fi

if [[ -z "$MIXER_IMAGE_PROJECT_ID" ]]; then
  echo "MIXER_IMAGE_PROJECT_ID is not set, using default: datcom-ci"
  MIXER_IMAGE_PROJECT_ID="datcom-ci"
fi

helm upgrade --install \
  dc-website deploy/helm_charts/dc_website \
  --atomic \
  --debug \
  --timeout 10m \
  --set resource_suffix="-custom" \
  --set website.image.project="$WEBSITE_IMAGE_PROJECT_ID" \
  --set website.image.tag="$WEBSITE_GITHASH" \
  --set website.githash="$WEBSITE_GITHASH" \
  --set mixer.image.project="$MIXER_IMAGE_PROJECT_ID" \
  --set mixer.image.tag="$MIXER_GITHASH" \
  --set mixer.githash="$MIXER_GITHASH" \
  --set website.gcpProjectID="$PROJECT_ID" \
  --set website.domain="$DOMAIN" \
  --set website.secretGCPProjectID="$PROJECT_ID" \
  --set mixer.gcpProjectID="$PROJECT_ID" \
  --set mixer.serviceName="website-esp.endpoints.$PROJECT_ID.cloud.goog" \
  --set ingress.enabled=true \
  --set-file mixer.schemaConfigs."base\.mcf"=mixer/deploy/mapping/base.mcf \
  --set-file mixer.schemaConfigs."encode\.mcf"=mixer/deploy/mapping/encode.mcf \
  --set-file kgStoreConfig.bigqueryVersion=mixer/deploy/storage/bigquery.version \
  --set-file kgStoreConfig.baseBigtableInfo=mixer/deploy/storage/base_bigtable_info.yaml

# Run the BT automation Terraform script to set up BT loader.
cd $ROOT

rm -rf tools
git clone https://github.com/datacommonsorg/tools --branch $CUSTOM_DC_RELEASE_TAG --single-branch


# TODO(alex): support custom robot SA and resource bucket name.
WEBSITE_ROBOT="website-robot@$PROJECT_ID.iam.gserviceaccount.com"
RESOURCE_BUCKET="$PROJECT_ID-resources"

cd tools/bigtable_automation/terraform

terraform init \
  -backend-config="bucket=$TF_STATE_BUCKET" \
  -backend-config="prefix=bt_automation"

terraform apply \
  -var="project_id=$PROJECT_ID" \
  -var="service_account_email=$WEBSITE_ROBOT" \
  -var="dc_resource_bucket=$RESOURCE_BUCKET" \
  -auto-approve

# Copy over sample tmcfs/csvs from reference resource bucket.
gsutil cp -r \
  gs://datcom-public/reference/tmcf_csv \
  gs://$RESOURCE_BUCKET/reference/tmcf_csv

_success_msg="
###############################################################################
# Status: Successfully launched the installer in $PROJECT_ID.
###############################################################################


###############################################################################
# Action required:
Please don't forget to email support+custom@datacommons.org with your
GCP project id for data access.
###############################################################################


###############################################################################
# Action required:
Please also make sure to click on the activation email for $DOMAIN
If the contact email has previously been used to verify domains,
then $DOMAIN will be already active without needing activation emails.
###############################################################################


To check the status of $DOMAIN, please visit the link below.
https://console.cloud.google.com/net-services/domains/registrations/list?project=$PROJECT_ID

Note:
You should expect the instance to be accessible via $DOMAIN
within 30 minutes or so after support@datacommons.org responds.
"
echo "$_success_msg"
