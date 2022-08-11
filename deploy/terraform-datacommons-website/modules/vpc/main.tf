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

module "vpc" {
  count = var.create_vpc ? 1 : 0
  source  = "terraform-google-modules/network/google"
  version = "~> 5.1"
  project_id   = var.project_id
  network_name = var.network_name
  routing_mode = "GLOBAL"
  subnets = [
    {
      subnet_name           = var.subnet_name
      subnet_ip             = var.subnet_ip
      subnet_region         = var.subnet_region
      subnet_private_access = true
      description           = "This subnet is managed by Terraform"
    }
  ]
  secondary_ranges = {
    "${var.subnet_name}" = [
      {
        range_name    = var.ip_range_pods_name
        ip_cidr_range = var.ip_range_pods
      },
      {
        range_name    = var.ip_range_services_name
        ip_cidr_range = var.ip_range_services
      },
    ]
  }
}

resource "google_compute_global_address" "peering_ip" {
  project       = var.project_id
  purpose       = "VPC_PEERING"
  name          = "vpc-peering-private-ip"
  address_type  = "INTERNAL"
  network       = var.network_name
  prefix_length = 16
  ip_version    = "IPV4"

  depends_on = [
    module.vpc
  ]
}

resource "google_service_networking_connection" "servicenetworking_googleapis_com" {
  network                 = "https://www.googleapis.com/compute/v1/projects/${var.project_id}/global/networks/${var.network_name}"
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.peering_ip.name]

  depends_on = [
    google_compute_global_address.peering_ip,
  ]
}
