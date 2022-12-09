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
    # Example cluster name: datacommons-us-central1
    cluster_name = format("%s-%s",var.cluster_name_prefix,var.region)
}

resource "null_resource" "gke_cluster" {
  provisioner "local-exec" {
    command = "sh create_cluster.sh"
    working_dir = path.module

    environment = {
      PROJECT_ID   = var.project_id
      CLUSTER_NAME = local.cluster_name
      NODES        = var.num_nodes
      REGION       = var.region
    }
  }
}


resource "null_resource" "gke_cluster_configuration" {
  provisioner "local-exec" {
    command = "sh configure_cluster.sh"
    working_dir = path.module

    environment = {
      PROJECT_ID   = var.project_id
      CLUSTER_NAME = local.cluster_name
      REGION       = var.region
    }
  }

  depends_on = [
    null_resource.gke_cluster
  ]
}
