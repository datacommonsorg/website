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

# This resource sets up the OAuth consent screen (This is required for IAP).
# As of google provider version 4.28.0, only "Organization Internal" brands
# can be created programatically via API. To convert it into an external
# brands please use the GCP Console.
# Source: https://registry.terraform.io/providers/hashicorp/google/3.48.0/docs/resources/iap_brand
resource "google_iap_brand" "project_brand" {
  project           = var.project_id
  support_email     = var.brand_support_email
  application_title = "Data Commons website"
}

resource "google_iap_client" "project_client" {
  display_name =  "Data Commons OAuth client"
  brand        =  google_iap_brand.project_brand.name
}

resource "google_project_iam_member" "web_users" {
  project = var.project_id
  role    = "roles/iap.httpsResourceAccessor"

  for_each = toset(var.web_user_members)
  member   = format("user:%s", each.key)
}