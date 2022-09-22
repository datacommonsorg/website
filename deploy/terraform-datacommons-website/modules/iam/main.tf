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

resource "google_service_account" "web_robot" {
  account_id   = var.website_robot_account_id
  display_name = "The workload identity of DC applications."
  project      = var.project_id
}

# Creation of service account is eventually consistent.
# Sleeping minimizes the chance that iam binding fails right after the SA is created.
resource "null_resource" "sleep_after_web_robot_creation" {
  provisioner "local-exec" {
    command = "sleep 10"
  }
}

# Instance project permissions
resource "google_project_iam_member" "web_robot_roles" {
  for_each = toset([
    "roles/endpoints.serviceAgent", # service control report for endpoints.
    "roles/logging.logWriter", # Logging and monitoring
    "roles/monitoring.metricWriter",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/compute.networkViewer",
    "roles/cloudtrace.agent",
    "roles/bigquery.jobUser",   # Query BigQuery
    "roles/pubsub.editor", # TMCF + CSV GCS data change subscription
    "roles/secretmanager.secretAccessor"
  ])
  role = each.key
  member = "serviceAccount:${google_service_account.web_robot.email}"
  project = var.project_id

  depends_on = [
    null_resource.sleep_after_web_robot_creation
  ]
}

# Storage project permissions
resource "google_project_iam_member" "web_robot_storage_roles" {
  for_each = toset([
    "roles/bigquery.admin",   # BigQuery
    "roles/bigtable.reader",  # Bigtable
    "roles/storage.objectViewer",  # Branch Cache Read
    "roles/pubsub.editor" # Branch Cache Subscription
  ])
  role = each.key
  member = "serviceAccount:${google_service_account.web_robot.email}"
  project = var.storage_project_id

  depends_on = [
    null_resource.sleep_after_web_robot_creation
  ]
}