#!/bin/bash
# Copyright 2020 Google LLC
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

# Dev project
PROJECT_ID=$(yq r ..//config.yaml project.dev)

# Update gcloud
gcloud components update

# Auth
gcloud auth login
gcloud config set project $PROJECT_ID

# Get the service account key
# TODO(shifucun): update "mixer-robot" to "website-robot"
gcloud iam service-accounts keys create website-robot-key.json \
      --iam-account mixer-robot@$GCP_PROJECT.iam.gserviceaccount.com
# Use the same robot account for website and mixer
cp website-robot-key.json mixer-robot-key.json
