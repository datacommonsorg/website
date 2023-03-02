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

variable "project_id" {
  type        = string
  description = "GCP project id."
}

variable "location" {
  type        = string
  description = "If location is a region like 'us-west1', then create a regional cluster. Otherwise create a zonal cluster."
}

variable "cluster_name_prefix" {
  type        = string
  description = "Prefix of the GKE cluster (to be used by the DC website) to create."
  default     = "datacommons"
}

variable "num_nodes" {
  type        = number
  description = "Number of nodes to create in GKE cluster."
  default     = 1
}

variable "web_robot_sa_email" {
  type        = string
  description = "Full service account used for workload identity."
}


variable "resource_suffix" {
  type        = string
  description = "Resource suffix unique defines a terraform actuation instance."
}
