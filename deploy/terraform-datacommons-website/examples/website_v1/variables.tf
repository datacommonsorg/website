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
variable "website_githash" {
  type        =  string
  description = "Determines which DC website image to use."
}

variable "mixer_githash" {
  type        =  string
  description = "Determines which DC Mixer image to use."
}

variable "project_id" {
  type        = string
  description = "This is the same GCP project id from the setup step."
}

variable "dc_website_domain" {
  type        = string
  description = "This is the domain registered from the setup step."
}

variable "web_robot_sa_email" {
  type        = string
  description = "Robot SA used for workload identity."
  default     = null
}

variable "cluster_name_prefix" {
  type        = string
  description = "Prefix used for GKE clusters to be created to host DC apps."
  default     = "datacommons"
}

variable "region" {
  type        =  string
  description = "GCP region where the cluster will be created in."
  default     = "us-central1"
}

variable "global_static_ip_name" {
  type        =  string
  description = "Name of the global static IP that exposes DC web service."
  default     = null
}

variable "resource_suffix" {
  type        = string
  description = "This is the resource_suffix generated from the setup step, if previous step used resource suffix."
  default     = null
}

variable "use_resource_suffix" {
  type        = bool
  description = "If true then add a random suffix to the ending of GCP resource names to avoid name collision."
  default     = false
}
