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
data "google_project" "project" {
    project_id = var.project_id
}

locals {
    resource_bucket_name = format("%s-resources", var.project_id)

    compute_default_sa_email = format(
        "%s-compute@developer.gserviceaccount.com", data.google_project.project.number)

    web_robot_sa_email = (
        var.web_robot_sa_email != null ?
        var.web_robot_sa_email :
        format("website-robot@%s.iam.gserviceaccount.com", var.project_id)
    )
 }

 locals {
     dataflow_worker_sa_email = (
         var.dataflow_worker_sa_email != null ?
         var.dataflow_worker_sa_email : local.compute_default_sa_email
     )
 }

# The resource bucket will hold
# 1) Custom DC raw data (csv, tmcf)
# 2) Compact cache (in csv) that will feed into BT tables.
# 3) Various artifacts such as dataflow temp artifacts, state files.
resource "google_storage_bucket" "dc_resources" {
  name          = local.resource_bucket_name
  location      = var.resource_bucket_location
  project       = var.project_id

  # Bucket cannot be deleted while objects are still in it.
  force_destroy = false

  uniform_bucket_level_access = true

  # Do not expose any object to the internet.
  public_access_prevention = "enforced"
}

resource "google_project_iam_member" "bt_automation_iam" {
  for_each = toset([
    "roles/dataflow.admin", # For Cloud Function to launch Dataflow jobs.
    "roles/bigtable.admin", # For Cloud Function to create private BT tables.
    "roles/storage.objectAdmin", # To interact with blobs in the resource bucket.
     # Web robot is also used for Cloud Function jobs, which launches Dataflow jobs.
     # It needs permission to impersonate Dataflow worker principal.
    "roles/iam.serviceAccountUser"
  ])
  role    = each.key
  member  = "serviceAccount:${local.web_robot_sa_email}"
  project = var.project_id
}

resource "google_project_iam_member" "dataflow_worker_iam" {
  role    = "roles/storage.objectAdmin" # For running csv -> BT table jobs.
  member  = "serviceAccount:${local.dataflow_worker_sa_email}"
  project = var.project_id
}
