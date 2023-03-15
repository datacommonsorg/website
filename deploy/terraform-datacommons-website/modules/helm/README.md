# Helm module

This module provides an interface to install the dc_website helm chart.

Note that helm and kubernetes providers must be passed in from the caller side.

## Usage

```tf
# Data resource that reads credentials from GKE.
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

```
