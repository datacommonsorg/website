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

# This is the full email of the custom DC service account.
# By default, it should follow the following format if the custom DC
# instance was set up using the "setup" example under
# terraform-datacommons-website.
# website-robot@<custom DC project id>.iam.gserviceaccount.com
#
# However, if it is not, then any GCP Service Account can also work.
# In such cases, the format should still follow:
# <prefix>@<custom DC project id>.iam.gserviceaccount.com
variable "custom_dc_web_robot_email" {
  type        = string
  description = "The GCP Service Account that will be running the custom DC web container."
}

variable "base_storage_project_id" {
  type        = string
  description = "The GCP project id where base BT cache and BQ datasets are located in."
  default     = "datcom-store"
}