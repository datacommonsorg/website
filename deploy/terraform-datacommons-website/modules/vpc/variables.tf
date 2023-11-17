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

variable "create_vpc" {
  type        = bool
  description = "Specifying true will create a new VPC network."
  default     = true
}

variable "project_id" {
  type        = string
  description = "GCP project id where the VPC will be created."
}

variable "network_name" {
  type        = string
  description = "The name of the network being created, or the name of a existing VPC network."
  default     = "data-commons-network"
}

variable "subnet_name" {
  type        = string
  description = "The name of the subnet being created to host the cluster in."
  default     = "data-commons-subnet"
}

variable "subnet_ip" {
  type        = string
  description = "The CIDR range of the subnet."
  default     = "10.10.10.0/24"
}

variable "subnet_region" {
  type        = string
  description = "GCP region where the subnet will be created."
}

variable "ip_range_pods_name" {
  type        = string
  description = "The name of the secondary ip range to use for GKE pods."
  default     = "ip-range-pods"
}

variable "ip_range_pods" {
  type        = string
  description = "The secondary ip range to use for GKE pods."
  default     = "192.168.0.0/18"
}

variable "ip_range_services_name" {
  type        = string
  description = "The name of the secondary ip range to use for GKE services."
  default     = "ip-range-svc"
}

variable "ip_range_services" {
  type        = string
  description = "The secondary ip range to use for GKE services."
  default     = "192.168.64.0/18"
}
