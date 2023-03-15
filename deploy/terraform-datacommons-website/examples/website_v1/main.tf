/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
terraform {
  backend "gcs" {}
}

provider "google" {
  project               = var.project_id
  billing_project       = var.project_id
  user_project_override = true
}

locals {
  resource_suffix    = var.use_resource_suffix ? format("-%s", var.resource_suffix) : ""
  web_robot_sa_email = (
    var.web_robot_sa_email != null ?
    var.web_robot_sa_email :
    format("website-robot@%s.iam.gserviceaccount.com", var.project_id)
  )
}

resource "google_project_iam_member" "web_robot_iam" {
  for_each = toset([
    "roles/endpoints.serviceAgent", # service control report for endpoints.
    "roles/logging.logWriter", # Logging and monitoring
    "roles/monitoring.metricWriter",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/compute.networkViewer",
    "roles/cloudtrace.agent",
    "roles/bigquery.jobUser",   # Query BigQuery
    "roles/pubsub.editor", # TMCF + CSV GCS data change subscription
    "roles/secretmanager.secretAccessor"
  ])
  role    = each.key
  member  = "serviceAccount:${local.web_robot_sa_email}"
  project = var.project_id
}

# For controller to communicate with and write data to resource bucket.
resource "google_project_iam_member" "datcom_iam" {
  for_each = toset([
    "roles/pubsub.subscriber",
    "roles/storage.admin"
  ])
  role    = each.key
  member  = "serviceAccount:datcom@system.gserviceaccount.com"
  project = var.project_id
}

module "apikeys" {
  source                   =  "../../modules/apikeys"
  project_id               = var.project_id
  dc_website_domain        = var.dc_website_domain
  location                 = var.location

  resource_suffix          = local.resource_suffix
}

module "esp" {
  source                   =  "../../modules/esp"
  project_id               = var.project_id
  mixer_githash            = var.mixer_githash
}

module "cluster" {
  source                   =  "../../modules/gke"
  project_id               = var.project_id
  location                 = var.location
  cluster_name_prefix      = var.cluster_name_prefix
  web_robot_sa_email       = local.web_robot_sa_email

  resource_suffix          = local.resource_suffix

  depends_on = [
    module.apikeys,
    module.esp,
    google_project_iam_member.web_robot_iam
  ]
}

resource "google_compute_managed_ssl_certificate" "dc_website_cert" {
  name    = format("dc-website-cert%s", local.resource_suffix)
  project = var.project_id

  managed {
    domains = [format("%s.", var.dc_website_domain)]
  }
}
