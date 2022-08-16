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

resource "null_resource" "fetch_mixer_grpc_latest_pb" {
  provisioner "local-exec" {
    command = "gsutil cp ${var.mixer_grpc_pb_gcs_path} /tmp/mixer-grpc.latest.pb"
  }
}

# Needed because file(https://www.terraform.io/language/functions/file)
# cannot be used for dynamically generated files.
data "local_file" "mixer_grpc_latest_pb" {
  filename = "/tmp/mixer-grpc.latest.pb"
  depends_on = [
    null_resource.fetch_mixer_grpc_latest_pb
  ]
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

  protoc_output_base64 = data.local_file.mixer_grpc_latest_pb.content_base64

  depends_on = [
    data.local_file.mixer_grpc_latest_pb
  ]
}
