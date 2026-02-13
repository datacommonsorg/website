#!/bin/bash
#
# Copyright 2025 Google LLC
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

# Check if both arguments are provided
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <WEBSITE_GITHASH> <MIXER_GITHASH> <PIPELINE_NAME>"
    echo "Example: $0 dev-72c634f dev-732ac9c datacommons-website-dev"
    exit 1
fi

WEBSITE_GITHASH=$1
MIXER_GITHASH=$2
DEPLOY_PIPELINE=$3
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

gcloud deploy releases create "dev-manual-$TIMESTAMP" \
--delivery-pipeline=$DEPLOY_PIPELINE \
--region=us-central1 \
--skaffold-file=skaffold.yaml \
--images="gcr.io/datcom-ci/datacommons-website=us-docker.pkg.dev/datcom-ci/gcr.io/datacommons-website:$WEBSITE_GITHASH,gcr.io/datcom-ci/datacommons-mixer=us-docker.pkg.dev/datcom-ci/gcr.io/datacommons-mixer:$MIXER_GITHASH,gcr.io/datcom-ci/datacommons-nodejs=us-docker.pkg.dev/datcom-ci/gcr.io/datacommons-nodejs:$WEBSITE_GITHASH,gcr.io/datcom-ci/datacommons-nl=us-docker.pkg.dev/datcom-ci/gcr.io/datacommons-nl:$WEBSITE_GITHASH,gcr.io/datcom-ci/datacommons-embeddings-sidecar=us-docker.pkg.dev/datcom-ci/gcr.io/datacommons-nl:mixer-sidecar" \
--deploy-parameters="MIXER_GITHASH=$MIXER_GITHASH,WEBSITE_GITHASH=$WEBSITE_GITHASH" \
--project=datcom-ci
