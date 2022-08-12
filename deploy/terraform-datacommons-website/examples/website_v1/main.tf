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
  backend "gcs" {
    prefix = "dc_website_v1"
  }
}

module "enabled_google_apis" {
  source  = "terraform-google-modules/project-factory/google//modules/project_services"
  version = "~> 13.0.0"
  project_id                  = var.project_id
  disable_services_on_destroy = false
  activate_apis = [
    "apikeys.googleapis.com",
    "binaryauthorization.googleapis.com",
    "compute.googleapis.com",
    "container.googleapis.com",
    "containerregistry.googleapis.com",
    "dns.googleapis.com",
    "iam.googleapis.com",
    "iap.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "secretmanager.googleapis.com",
    "servicenetworking.googleapis.com",
    "stackdriver.googleapis.com"
  ]
}

module "iam" {
  source                   =  "../../modules/iam"
  project_id               = var.project_id
  storage_project_id       = var.storage_project_id
}

module "iap" {
  source                   =  "../../modules/iap"
  project_id               = var.project_id
  brand_support_email      = var.brand_support_email
  web_user_members         = var.web_user_members
}

module "vpc" {
  source                   =  "../../modules/vpc"
  project_id               = var.project_id
  subnet_region            = var.region

  depends_on = [
    module.enabled_google_apis
  ]
}

module "apikeys" {
  source                   =  "../../modules/apikeys"
  project_id               = var.project_id
  website_domain           = var.website_domain

  depends_on = [
    module.enabled_google_apis
  ]
}

module "esp" {
  source                   =  "../../modules/esp"
  project_id               = var.project_id

  depends_on = [
    module.enabled_google_apis
  ]
}
