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
# Needed because file(https://www.terraform.io/language/functions/file)
# cannot be used for dynamically generated files.
# Once https://github.com/GoogleCloudPlatform/magic-modules/pull/6895
# is merged, this can be replaced with google_storage_bucket_object_content so that
# mixer grpc pb can be fetched directly from gcs, as opposed first downloading it locally.
# https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/storage_bucket_object_content
#
#
# Currently this is copied over during terraform runtime in install_custom_dc.sh
# This is because terraform apply expects the file to already exist at the path
# specified below.
# When testing locally, copy over the mixer grpc pb manually into the current
# module folder, like below. (Script below assumes you are currently in module folder).
# gsutil cp \
#  gs://datcom-mixer-grpc/mixer-grpc/mixer-grpc.$MIXER_GITHASH.pb \
#  mixer-grpc.$MIXER_GITHASH.pb
data "local_file" "mixer_grpc_pb" {
  filename = "${path.module}/mixer-grpc.${var.mixer_githash}.pb"
}

# Note: deleted endpoints cannot be re-created.
# Instead, undelete the endpoint.
# gcloud endpoints services undelete website-esp.endpoints.<$project-id>.cloud.goog
resource "google_endpoints_service" "mixer_endpoint" {
  service_name         = "website-esp.endpoints.${var.project_id}.cloud.goog"
  project              = var.project_id
  grpc_config          = replace(replace(file("${path.module}/endpoints.yaml.tpl"),
                             "%SERVICE_NAME%", "website-esp.endpoints.${var.project_id}.cloud.goog"),
                             "%API_TITLE%"   , "website-esp.endpoints.${var.project_id}.cloud.goog")

  protoc_output_base64 = data.local_file.mixer_grpc_pb.content_base64

  depends_on = [
    data.local_file.mixer_grpc_pb
  ]
}

# Service deployed to Cloud Endpoints must first be enabled before usage.
resource "google_project_service" "project" {
  project = var.project_id
  service = "website-esp.endpoints.${var.project_id}.cloud.goog"

  depends_on = [
    google_endpoints_service.mixer_endpoint
  ]
}
