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
  member  = "serviceAccount:${var.web_robot_sa_email}"
  project = var.project_id
}

module "apikeys" {
  source                   =  "../../modules/apikeys"
  project_id               = var.project_id
  dc_website_domain        = var.dc_website_domain

  resource_suffix          = var.resource_suffix
}

module "esp" {
  source                   =  "../../modules/esp"
  project_id               = var.project_id
}

module "cluster" {
  source                   =  "../../modules/gke"
  project_id               = var.project_id
  region                   = var.region
  cluster_name_prefix      = var.cluster_name_prefix
  web_robot_sa_email       = var.web_robot_sa_email

  resource_suffix          = var.resource_suffix

  depends_on = [
    module.apikeys,
    module.esp,
    google_project_iam_member.web_robot_iam
  ]
}

resource "google_compute_managed_ssl_certificate" "dc_website_cert" {
  name    = format("dc-website-cert-%s", var.resource_suffix)
  project = var.project_id

  managed {
    domains = [format("%s.", var.dc_website_domain)]
  }
}

data "google_container_cluster" "dc_web_cluster" {
  name = module.cluster.name
  location = var.region
  project = var.project_id

  depends_on = [module.cluster]
}

data "google_client_config" "default" {}

provider "kubernetes" {
  alias = "datcom"
  host  = "https://${data.google_container_cluster.dc_web_cluster.endpoint}"
  token = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(
    data.google_container_cluster.dc_web_cluster.master_auth[0].cluster_ca_certificate
  )
}

provider "helm" {
  alias = "datcom"
  kubernetes {
    host                   = "https://${data.google_container_cluster.dc_web_cluster.endpoint}"
    token                  = data.google_client_config.default.access_token
    cluster_ca_certificate = base64decode(
      data.google_container_cluster.dc_web_cluster.master_auth[0].cluster_ca_certificate
    )
  }
}

module "k8s_resources" {
  providers = {
    kubernetes = kubernetes.datcom
    helm       = helm.datcom
  }

  source                   =  "../../modules/helm"
  project_id               = var.project_id

  cluster_name             = module.cluster.name
  cluster_region           = var.region
  dc_website_domain        = var.dc_website_domain
  global_static_ip_name    = format("dc-website-ip-%s", var.resource_suffix)
  managed_cert_name        = google_compute_managed_ssl_certificate.dc_website_cert.name

  depends_on = [
    google_compute_managed_ssl_certificate.dc_website_cert,
    module.cluster
  ]
}
