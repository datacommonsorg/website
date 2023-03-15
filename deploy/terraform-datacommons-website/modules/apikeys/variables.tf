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
  description = "GCP project id where the API keys will be created."
}

variable "dc_website_domain" {
  type        = string
  description = "Domain name that you own that will be used for the Data Commons website."
}

variable "location" {
  type        = string
  description = "region to create the API key secret. Ex: us-central1"
}

variable "resource_suffix" {
  type        = string
  description = "This string is added to all resources created in this moudle for uniqueness."
}