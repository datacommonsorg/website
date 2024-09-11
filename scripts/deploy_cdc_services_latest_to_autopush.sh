#!/bin/bash
#
# Copyright 2024 Google LLC
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

# Deploys the custom DC services image tagged "latest" to the dc-autopush service.

# The script also updates a RESTART_TIMESTAMP env var
# to easily identify the restart time of a given revision.

# Usage: From root, ./scripts/deploy_cdc_services_latest_to_autopush.sh

# The latest image = gcr.io/datcom-ci/datacommons-services:latest
# autopush service: https://pantheon.corp.google.com/run/detail/us-central1/dc-autopush/revisions?project=datcom-website-dev
# autopush URL: https://dc-autopush-496370955550.us-central1.run.app

set -e
set -x

# Deploy latest image to dc-autopush Cloud Run service
gcloud run deploy dc-autopush \
  --project datcom-website-dev \
  --image gcr.io/datcom-ci/datacommons-services:latest \
  --region us-central1 \
  --update-env-vars RESTART_TIMESTAMP="$(date)"
