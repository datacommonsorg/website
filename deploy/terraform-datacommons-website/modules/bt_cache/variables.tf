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
variable "resource_suffix" {
  type        = string
  description = "Optional suffix to add to GCP resources for uniqueness."
  default     = null
}

variable "project_id" {
  type        = string
  description = "This is the same GCP project id from the setup step."
}

variable "region" {
  type        = string
  description = "Region to setup the Cloud Function in. Should match the region of the other resources."
}

variable "dc_resource_bucket" {
  type        = string
  description = "Name of the GCS bucket that stores DC resources. Do not include the scheme(gs://)."
}

variable "csv2bt_template_path" {
  type        = string
  description = "Full GCS path, including scheme, to the Dataflow template to load BT cache."
  default     = "gs://datcom-templates/templates/flex/csv_to_bt.json"
}

variable "bt_instance_zone" {
  type        = string
  description = "Zone to create the BT instance in."
}

variable "bt_autoscaling_min_nodes" {
  type        = number
  description = "Min # of nodes for BT table caches."
  default     = 1
}

variable "bt_autoscaling_max_nodes" {
  type        = number
  description = "Max # of nodes for BT table caches."
  default     = 3
}

variable "service_account_email" {
  type        = string
  description = "GCP service account email to be used for BT automation Cloud Function."
}
