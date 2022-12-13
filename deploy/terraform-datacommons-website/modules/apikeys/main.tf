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

# The following resource currently has issues with ADC authentication.
# Instead, snippets from the following script
# https://github.com/datacommonsorg/website/blob/master/gke/create_api_key.sh
# are used as a local-exec resource.
# Since Terraform resources are preferred over shell scripts, this snippet
# is commented out for reference.
# When the issue from Github is resolve, please switch over to the Terraform
# resource by following the steps below.
#   1. Uncomment the resource below.
#   2. Delete null_resource.maps_api_key block.
#   3. Delete local_file.website_api_key block.
#   4. Replace all references of null_resource.maps_api_key
#      with "google_apikeys_key.maps_api_key".
#   5. Replace data.local_file.website_api_key.content
#      with "google_apikeys_key.maps_api_key.key_string".
# For more on the issue, see the following Github issue.
# https://github.com/hashicorp/terraform-provider-google/issues/11865
# are used in a local-exec script.
# resource "google_apikeys_key" "maps_api_key" {
#  name         = "maps-api-key"
#  display_name = "maps-api-key"
#  project      =  var.project_id
#
#  restrictions {
#    browser_key_restrictions {
#      allowed_referrers= ["https://${var.website_domain}/*"]
#    }
#
#    api_targets {
#      service = "maps-backend.googleapis.com"
#    }
#
#    api_targets {
#      service = "places-backend.googleapis.com"
#    }
#  }
# }

resource "null_resource" "maps_api_key" {
  provisioner "local-exec" {
    command = <<EOT
gcloud alpha services api-keys create \
--project=${var.project_id} \
--display-name=maps-api-key${var.resource_suffix} \
--allowed-referrers=https://${var.dc_website_domain}/* \
--api-target=service=maps-backend.googleapis.com \
--api-target=service=places-backend.googleapis.com

touch /tmp/dc-website-api-key

API_KEY_NAME=$(gcloud alpha services api-keys list --project=${var.project_id} --filter='displayName=maps-api-key${var.resource_suffix}' --format='value(name)' | head -n 1)
gcloud alpha services api-keys get-key-string $API_KEY_NAME --format='value(keyString)' >> /tmp/dc-website-api-key

EOT
  }
}

# Needed because file(https://www.terraform.io/language/functions/file)
# cannot be used for dynamically generated files.
data "local_file" "website_api_key" {
  filename = "/tmp/dc-website-api-key"
  depends_on = [null_resource.maps_api_key]
}

resource "google_secret_manager_secret" "maps_api_key_secret" {
  secret_id    = format("maps-api-key%s", var.resource_suffix)
  project      =  var.project_id

  replication {
    automatic = true
  }

  depends_on = [null_resource.maps_api_key]
}

resource "google_secret_manager_secret_version" "maps_api_key_secret_version" {
  secret = google_secret_manager_secret.maps_api_key_secret.id

  secret_data = data.local_file.website_api_key.content

  depends_on = [
    google_secret_manager_secret.maps_api_key_secret,
    null_resource.maps_api_key
  ]
}
