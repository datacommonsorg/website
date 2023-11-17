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
terraform {
  backend "gcs" {}
}

resource "random_id" "rnd" {
  byte_length = 4
}

locals {
  # If the website domain is not provided, then the following default domain is to be created.
  # <project_id>-datacommons.com
  # <<<<< BEGIN Important note >>>>>
  # Because <project_id>-datacommons.com is unlikely to be a common domain name,
  # we make an assumption that the cost is $12.00 USD per year.
  # If that is not the case, look up the cost of the domain on domains.google.com,
  # and use that as an input for the domain_yearly_price variable.
  #
  # This is where the default domain is defined. When changing the default domain name,
  # please also change the value of dc_website_domain in scripts/get-dc.sh.
  # <<<<< END Important note >>>>>
  dc_website_domain = coalesce(
    var.dc_website_domain, format("%s-datacommons.com", var.project_id))

  resource_suffix = var.use_resource_suffix ? format("-%s", random_id.rnd.hex) : ""
}

module "enabled_google_apis" {
  source  = "terraform-google-modules/project-factory/google//modules/project_services"
  version = "~> 13.0.0"
  project_id                  = var.project_id
  disable_services_on_destroy = false
  activate_apis = [
    "apikeys.googleapis.com",
    "bigtableadmin.googleapis.com",
    "binaryauthorization.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudfunctions.googleapis.com",
    "compute.googleapis.com",
    "container.googleapis.com",
    "containerregistry.googleapis.com",
    "dataflow.googleapis.com",
    "dns.googleapis.com",
    "domains.googleapis.com",
    "iam.googleapis.com",
    "iap.googleapis.com",
    "logging.googleapis.com",
    "maps-backend.googleapis.com", # Maps Javascript API
    "places-backend.googleapis.com", # Google maps places API
    "monitoring.googleapis.com",
    "secretmanager.googleapis.com",
    "servicenetworking.googleapis.com",
    "stackdriver.googleapis.com"
  ]
}

resource "google_service_account" "web_robot" {
  account_id   = var.website_robot_account_id
  display_name = "The account id to the SA that will run custom DC web containers."
  project      = var.project_id

  depends_on   = [module.enabled_google_apis]
}

resource "google_compute_global_address" "dc_website_ingress_ip" {
  name         = format("dc-website-ip%s", local.resource_suffix)
  project      = var.project_id

  depends_on   = [module.enabled_google_apis]
}

resource "google_dns_managed_zone" "datacommons_zone" {

  count = var.register_domain ? 1 : 0

  name          = format("datacommons%s", local.resource_suffix)
  dns_name      = format("%s.", local.dc_website_domain)
  project       = var.project_id
  dynamic "dnssec_config" {
      for_each  = var.is_dns_public == true ? [1] : []
      content {
          state = "on"
      }
  }

  depends_on = [module.enabled_google_apis]
}

resource "google_dns_record_set" "website_record" {

  count = var.register_domain ? 1 : 0

  name         = "${google_dns_managed_zone.datacommons_zone[0].dns_name}"
  managed_zone = google_dns_managed_zone.datacommons_zone[0].name
  type         = "A"
  ttl          = 300
  project      = var.project_id

  rrdatas = [google_compute_global_address.dc_website_ingress_ip.address]

  depends_on = [
      google_dns_managed_zone.datacommons_zone,
      google_compute_global_address.dc_website_ingress_ip
  ]
}

locals {
    single_quoted_array_contact_addresses  = format("[%s]",
        var.single_quoted_comma_separated_contact_addresses
    )

    single_quoted_array_contact_recipients = format("[%s]",
        var.single_quoted_comma_separated_contact_recipients
    )
}

# null_resource isn't a cloud resource.
# It is used for running the script to represent "create" method.
resource "null_resource" "cloud_domain" {

  count = var.register_domain ? 1 : 0

  provisioner "local-exec" {
    command = "sh register_dc_website_domain.sh"
    working_dir = path.module

    environment = {
      PROJECT_ID                          = var.project_id
      DC_WEBSITE_DOMAIN                   = local.dc_website_domain
      DOMAIN_YEARLY_PRICE                 = var.domain_yearly_price
      CONTACT_EMAIL                       = var.contact_email
      CONTACT_PHONE_INTERNALTIONAL_FORMAT = var.contact_phone_internaltional_format
      CONTACT_REGION_CODE                 = var.contact_region_code
      CONTACT_POSTAL_CODE                 = var.contact_postal_code
      CONTACT_ADMIN_ADREA                 = var.contact_admin_area
      CONTACT_LOCALITY                    = var.contact_locality
      ARRAY_CONTACT_ADDRESSES             = local.single_quoted_array_contact_addresses
      ARRAY_CONTACT_RECIPIENTS            = local.single_quoted_array_contact_recipients
      DNS_ZONE_NAME                       = google_dns_managed_zone.datacommons_zone[0].name
    }
  }

  depends_on = [
    google_dns_managed_zone.datacommons_zone
  ]
}

locals {
  resource_bucket_name = local.resource_suffix != "" ? format(
    "%s-%s-resources", var.project_id, local.resource_suffix) : format("%s-resources", var.project_id)
}

# The resource bucket will hold
# 1) Custom DC raw data (csv, tmcf)
# 2) Compact cache (in csv) that will feed into BT tables.
# 3) Various artifacts such as dataflow temp artifacts, state files.
resource "google_storage_bucket" "dc_resource_bucket" {
  name          = local.resource_bucket_name
  location      = var.resource_bucket_location
  project       = var.project_id

  # Bucket cannot be deleted while objects are still in it.
  force_destroy = false

  uniform_bucket_level_access = true

  # Do not expose any object to the internet.
  public_access_prevention = "enforced"
}
