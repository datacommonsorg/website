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

resource "google_project_iam_member" "web_robot_storage_roles" {
  for_each = toset([
    "roles/bigquery.admin",   # BigQuery
    "roles/bigtable.reader",  # Bigtable
    "roles/storage.objectViewer",  # Branch Cache Read
    "roles/pubsub.editor" # Branch Cache Subscription
  ])
  role = each.key
  member = "serviceAccount:${var.custom_dc_web_robot_email}"
  project = var.base_storage_project_id
}