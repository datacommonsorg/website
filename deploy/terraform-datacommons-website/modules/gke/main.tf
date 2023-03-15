# Copyright 2022 Google LLC
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

locals {
    # Example cluster name: datacommons-us-central1 or datacommons-us-central1-a
    cluster_name = format("%s-%s%s",var.cluster_name_prefix,var.location, var.resource_suffix)
}

resource "google_container_cluster" "primary" {
  name     = local.cluster_name
  location = var.location

  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = true
  initial_node_count       = 1
  networking_mode          = "VPC_NATIVE"

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  ip_allocation_policy {
    cluster_ipv4_cidr_block = "/14"
  }
}

resource "google_container_node_pool" "gke_node_pools" {
  name       = local.cluster_name
  location   = var.location
  cluster    = google_container_cluster.primary.name
  node_count = var.num_nodes

  node_config {
    machine_type = "e2-highmem-4"
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }

  depends_on = [
    google_container_cluster.primary
  ]
}

resource "null_resource" "gke_cluster_configuration" {
  provisioner "local-exec" {
    command = "sh configure_cluster.sh"
    working_dir = path.module

    environment = {
      PROJECT_ID         = var.project_id
      CLUSTER_NAME       = local.cluster_name
      LOCATION           = var.location
      WEB_ROBOT_SA_EMAIL = var.web_robot_sa_email
    }
  }

  depends_on = [
    google_container_cluster.primary,
    google_container_node_pool.gke_node_pools
  ]
}
