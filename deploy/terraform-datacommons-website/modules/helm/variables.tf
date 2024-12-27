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
 variable "cluster_name" {
  type        = string
  description = "Name of the GKE cluster to deploy the helm chart to."
}

variable "cluster_region" {
  type        = string
  description = "Region ofthe GKE cluster, ex: us-central1."
}

variable "project_id" {
  type        = string
  description = "Project id of the GCP project where the website is to be set up."
}

variable "dc_website_domain" {
  type        = string
  description = "Domain of the website."
}

variable "website_ksa_name" {
  type        = string
  description = "Name of the namespace k8s service account use by website pods."
  default     = "website-ksa"
}

variable "enable_ingress" {
  type        = bool
  description = "Enabling ingress exposes the dc website to the internet."
  default     = true
}

variable "global_static_ip_name" {
  type        = string
  description = "Name of the Ipv4 global static ip in GCP where dc_website_domain resolves to."
}

variable "managed_cert_name" {
  type        = string
  description = "Name of the managed certificate in GCP for dc_website_domain."
}

variable "website_githash" {
  type        = string
  description = "website githash"
}

variable "mixer_githash" {
  type        = string
  description = "Mixer githash"
}

variable "resource_suffix" {
  type        = string
  description = "Resource suffix to pass in to the Helm chart"
}
