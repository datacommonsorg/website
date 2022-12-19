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
locals {
    resource_suffix = (
        var.resource_suffix != null ?
        format("-%s", var.resource_suffix) : ""
    )
}

# BigTable instance used to store cache tables.
resource "google_bigtable_instance" "bt_cache" {
  name           = format("dc-graph%s", local.resource_suffix)
  project        = var.project_id

  cluster {
    # There will be one cluster. Constant seems appropriate for now.
    cluster_id   = "dc-graph-c1"
    zone         = var.bt_instance_zone

    autoscaling_config {
      min_nodes  = var.bt_autoscaling_min_nodes
      max_nodes  = var.bt_autoscaling_max_nodes
      cpu_target = 75
    }
  }
}

# Download relevant go files from tools repo for Custom DC gcf.
# Currently uses PrivateBTImportController as entrypoint.
resource "null_resource" "fetch_gcf_source_from_tools_repo" {
  provisioner "local-exec" {
    # Output is "${path.module}/source/bt_automation_go_source.zip"
    command = "sh fetch_gcf_source.sh"
    working_dir = path.module
  }
}

# Upload zipped go source. Consumed by gcf.
resource "google_storage_bucket_object" "bt_automation_archieve" {
    # Relative path in the resource bucket to upload the archieve.
    name   = "cloud_functions/bt_automation_go_source.zip"
    source = "${path.module}/source/bt_automation_go_source.zip"
    bucket = var.dc_resource_bucket

    depends_on = [
        null_resource.fetch_gcf_source_from_tools_repo
    ]
}

resource "google_cloudfunctions_function" "bt_automation" {
  name        = format(
      "prophet-cache-trigger-%s%s", var.project_id, local.resource_suffix)
  project        = var.project_id
  description = "For triggering BT cache build on gcs file writes."
  runtime     = "go116"
  region      = var.region

  timeout                      = 300
  entry_point                  = "PrivateBTImportController"

  service_account_email        = var.service_account_email

  source_archive_bucket = google_storage_bucket_object.bt_automation_archieve.bucket
  source_archive_object = google_storage_bucket_object.bt_automation_archieve.name

  dynamic "event_trigger" {
      for_each  = [1]
      content {
          # Triggered on blob write to objects in the resource bucket.
          event_type = "google.storage.object.finalize"
          resource   = var.dc_resource_bucket
      }
  }

  environment_variables = {
    projectID        = var.project_id
    bucket           = var.dc_resource_bucket

    # Variables from BT instance created from this file.
    instance         = google_bigtable_instance.bt_cache.name
    cluster          = google_bigtable_instance.bt_cache.cluster[0].cluster_id
    nodesLow         = google_bigtable_instance.bt_cache.cluster[0].autoscaling_config[0].min_nodes
    nodesHigh        = google_bigtable_instance.bt_cache.cluster[0].autoscaling_config[0].max_nodes

    dataflowTemplate = var.csv2bt_template_path
    tempLocation     = format("gs://%s/dataflow/tmp", var.dc_resource_bucket)
  }

  depends_on = [
      google_storage_bucket_object.bt_automation_archieve
  ]
}
