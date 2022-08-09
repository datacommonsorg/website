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

variable "project_id" {
  type        = string
  description = "Project id of the GCP project where the website is to be set up."
}

variable "storage_project_id" {
  type        = string
  description = "Project id of the GCP project id of an existing data storage project."
}

variable "brand_support_email" {
  type        = string
  description = "Branch support email."
  default     = null
}

variable "web_user_members" {
  type        =  list(string)
  description = "List of users that are allowed to be authenticated in IAP."
}

variable "region" {
  type        =  string
  description = "GCP region where the cluster will be created in."
}
