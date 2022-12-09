variable "project_id" {
  type        = string
  description = "GCP project id."
}

variable "region" {
  type        = string
  description = "Region to create the GKE cluster in. Ex: us-central1"
  default     = "us-central1"
}


variable "cluster_name" {
  type        = string
  description = "Name of the GKE cluster (to be used by the DC website) to create."
  default     = "datacommons"
}

variable "num_nodes" {
  type        = number
  description = "Number of nodes to create in GKE cluster."
  default     = 1
}
