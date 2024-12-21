#!/bin/bash
# Copyright 2024 Google LLC
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

# Script to sync HTML templates with the website GCS bucket
# (datcom-website-config in project ID datcom-204919).
# Used for updating the HTML templates used in SEO experimentation
# Will set the contents of the GCS bucket to match what's in local HEAD.
#
# To Use:
#  (0) Set up server/config/seo_expermients/html_templates to contain the
#      HTML templates in the hierarchy desired.
#  (1) Make sure you're running from root with a clean HEAD
#  (2) Make sure you've signed into authenticated to gcloud using 
#          `gcloud auth application-default login`
#  (3) Run `./scripts/sync_seo_experiment_templates_to_gcs.sh`

gcloud storage rsync server/config/seo_experiments/html_templates/ gs://datcom-website-config/seo_experiments --recursive