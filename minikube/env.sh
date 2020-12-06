#!/bin/bash
set -a

# Pod replica
REPLICAS="1"

# Website resource
WEBSITE_MEM_REQ="1G"
WEBSITE_CPU_REQ="500m"
WEBSITE_MEM_LIMIT="1G"
WEBSITE_CPU_LIMIT="500m"
# Website container
WEBSITE_IMAGE="website:local"
WEBSITE_PULL_POLICY="Never"


# Cloud Endpoints service name
email=$(git config user.email)
SERVICE_NAME="${email/@/.}.endpoints.datcom-mixer-staging.cloud.goog"
# ESP resources
ESP_MEM_REQ="0.5G"
ESP_CPU_REQ="500m"
ESP_MEM_LIMIT="1G"
ESP_CPU_LIMIT="1000m"


# Mixer resources
MIXER_MEM_REQ="2G"
MIXER_CPU_REQ="500m"
MIXER_MEM_LIMIT="2G"
MIXER_CPU_LIMIT="1000m"
# Mixer container
MIXER_IMAGE="gcr.io/datcom-ci/datacommons-mixer:latest"
MIXER_PULL_POLICY="Always"
# Mixer arguments
BQ_DATASET="$(head -1 ../mixer/deployment/bigquery.txt)"
BT_TABLE="$(head -1 ../mixer/deployment/bigtable.txt)"
BT_PROJECT="google.com:datcom-store-dev"
BT_INSTANCE="prophet-cache"
PROJECT_ID="datcom-mixer-staging"
BRANCH_FOLDER="dummy"
