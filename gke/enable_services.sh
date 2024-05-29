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

PROJECT_ID=$(yq eval '.project' "../deploy/helm_charts/envs/$1.yaml")

gcloud services enable --project=$PROJECT_ID \
  anthos.googleapis.com \
  multiclusteringress.googleapis.com \
  multiclusterservicediscovery.googleapis.com \
  container.googleapis.com \
  gkeconnect.googleapis.com \
  gkehub.googleapis.com \
  cloudresourcemanager.googleapis.com \
  servicecontrol.googleapis.com \
  maps-backend.googleapis.com \
  places-backend.googleapis.com \
  secretmanager.googleapis.com \
  api.datacommons.org \
  generativelanguage.googleapis.com \
  bigtableadmin.googleapis.com \
  dataflow.googleapis.com
