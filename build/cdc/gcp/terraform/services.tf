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

# GCP service APIs

# Enable the API Keys API
resource "google_project_service" "apikeys" {
  project = var.project_id
  service = "apikeys.googleapis.com"
}

# Enable the Maps API
resource "google_project_service" "maps_service" {
  project = var.project_id
  service = "maps-backend.googleapis.com"
}

# Enable Places API
resource "google_project_service" "places_service" {
  project = var.project_id
  service = "places-backend.googleapis.com"
}

# Enable Data Commons API
resource "google_project_service" "datacommons_service" {
  project = var.project_id
  service = "api.datacommons.org"
}

# Enable Compute Engine and VPC networking API
resource "google_project_service" "compute" {
  project = var.project_id
  service = "compute.googleapis.com"
}

# Enable Google Cloud Memorystore (Redis) API
resource "google_project_service" "redis" {
  project = var.project_id
  service = "redis.googleapis.com"
}

# Enable Cloud SQL API
resource "google_project_service" "sqladmin" {
  project = var.project_id
  service = "sqladmin.googleapis.com"
}

# Enable Google Cloud Storage API
resource "google_project_service" "storage" {
  project = var.project_id
  service = "storage.googleapis.com"
}

# Enable Cloud Run API
resource "google_project_service" "run" {
  project = var.project_id
  service = "run.googleapis.com"
}

# Enable VPC Access API for Cloud Run
resource "google_project_service" "vpcaccess" {
  project = var.project_id
  service = "vpcaccess.googleapis.com"
}

# Enable IAM roles and service accounts API
resource "google_project_service" "iam" {
  project = var.project_id
  service = "iam.googleapis.com"
}

# Enable secrets manager API
resource "google_project_service" "secrets" {
  project = var.project_id
  service = "secretmanager.googleapis.com"
}
