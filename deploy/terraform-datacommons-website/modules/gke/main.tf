
resource "null_resource" "gke_cluster" {
  provisioner "local-exec" {
    command = "sh create_cluster.sh"
    working_dir = path.module

    environment = {
      PROJECT_ID   = var.project_id
      CLUSTER_NAME = var.cluster_name
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
      CLUSTER_NAME = var.cluster_name
      REGION       = var.region
    }
  }

  depends_on = [
    null_resource.gke_cluster
  ]
}
