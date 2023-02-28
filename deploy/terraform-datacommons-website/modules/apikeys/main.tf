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

# Caller main.tf must set billing_project to target GCP project
# and set user_project_override to true within "google" provider block
# See below for details.
# https://github.com/hashicorp/terraform-provider-google/issues/11865
resource "google_apikeys_key" "maps_api_key" {
 name         = "maps-api-key"
 display_name = "maps-api-key"
 project      =  var.project_id

 restrictions {
   browser_key_restrictions {
     allowed_referrers= ["https://${var.dc_website_domain}/*"]
   }

   api_targets {
     service = "maps-backend.googleapis.com"
   }

   api_targets {
     service = "places-backend.googleapis.com"
   }
 }
}

resource "google_secret_manager_secret" "maps_api_key_secret" {
  secret_id    = format("maps-api-key%s", var.resource_suffix)
  project      =  var.project_id

  replication {
    user_managed {
      replicas {
        location = var.location
      }
    }
  }

  depends_on = [google_apikeys_key.maps_api_key]
}

resource "google_secret_manager_secret_version" "maps_api_key_secret_version" {
  secret = google_secret_manager_secret.maps_api_key_secret.id

  secret_data = google_apikeys_key.maps_api_key.key_string

  depends_on = [
    google_secret_manager_secret.maps_api_key_secret,
  ]
}
