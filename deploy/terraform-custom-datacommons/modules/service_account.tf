# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Custom Data Commons service account


resource "google_service_account" "datacommons_service_account" {
  account_id   = "${var.namespace}-datacommons-sa"
  display_name = "Data Commons Service Account for ${var.project_id} (namespace = ${var.namespace})"
}

resource "google_project_iam_member" "datacommons_service_account_roles" {
  for_each = toset(["roles/compute.networkViewer", "roles/redis.editor", "roles/cloudsql.admin", "roles/storage.objectAdmin", "roles/run.admin", "roles/vpcaccess.user", "roles/iam.serviceAccountUser", "roles/secretmanager.secretAccessor"])
  project  = var.project_id
  member   = "serviceAccount:${google_service_account.datacommons_service_account.email}"
  role     = each.value
}
