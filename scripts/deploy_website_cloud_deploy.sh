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

# Check if arguments are provided (3 args auto-resolves latest narratives hash; 4 args uses explicit narratives hash)
if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
    echo "Usage: $0 <WEBSITE_GITHASH> <MIXER_GITHASH> [NARRATIVES_GITHASH] <PIPELINE_NAME>"
    echo "Example (auto-resolve latest narratives image): $0 dev-72c634f dev-732ac9c datacommons-website-dev"
    echo "Example (explicit narratives image):            $0 dev-72c634f dev-732ac9c a1b2c3d datacommons-website-dev"
    exit 1
fi

WEBSITE_GITHASH=$1
MIXER_GITHASH=$2

if [ "$#" -eq 4 ]; then
    NARRATIVES_GITHASH=$3
    DEPLOY_PIPELINE=$4
else
    DEPLOY_PIPELINE=$3
    echo "Fetching latest narratives image hash from Artifact Registry..."
    NARRATIVES_GITHASH=$(gcloud container images list-tags us-docker.pkg.dev/datcom-ci/gcr.io/datacommons-narratives \
        --project=datcom-ci \
        --filter="NOT tags ~ ^dev-" --sort-by=~TIMESTAMP --limit=1 \
        --format='get(tags)' | tr ';' '\n' | grep -E '^[0-9a-f]{7,40}$' | head -n 1 || true)
    if [ -z "$NARRATIVES_GITHASH" ]; then
        echo "Error: Could not determine the latest narratives image hash from Artifact Registry. Please pass <NARRATIVES_GITHASH> explicitly." >&2
        exit 1
    fi
    echo "Using latest narratives image hash: $NARRATIVES_GITHASH"
fi

TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

gcloud deploy releases create "dev-manual-$TIMESTAMP" \
--delivery-pipeline=$DEPLOY_PIPELINE \
--region=us-central1 \
--skaffold-file=skaffold.yaml \
--images="gcr.io/datcom-ci/datacommons-website=us-docker.pkg.dev/datcom-ci/gcr.io/datacommons-website:$WEBSITE_GITHASH,gcr.io/datcom-ci/datacommons-mixer=us-docker.pkg.dev/datcom-ci/gcr.io/datacommons-mixer:$MIXER_GITHASH,gcr.io/datcom-ci/datacommons-nodejs=us-docker.pkg.dev/datcom-ci/gcr.io/datacommons-nodejs:$WEBSITE_GITHASH,gcr.io/datcom-ci/datacommons-narratives=us-docker.pkg.dev/datcom-ci/gcr.io/datacommons-narratives:$NARRATIVES_GITHASH" \
--deploy-parameters="mixer.githash=$MIXER_GITHASH,MIXER_GITHASH=$MIXER_GITHASH,website.githash=$WEBSITE_GITHASH" \
--project=datcom-ci