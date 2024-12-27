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
variable "project_id" {
  type        = string
  description = "GCP project id where the DC website will be installed in."
}

variable "contact_email" {
  type        = string
  description = "Contact email for domain. Must be a valid email and will be used for activating the domain."
  default     = null
}

variable "website_robot_account_id" {
  type        = string
  description = "The prefix of the GCP service account to be created."
  default     = "website-robot"
}

variable "register_domain" {
  type        = bool
  description = "Enabling this flag will register a new domain in Cloud Domains and configure the DNS in Cloud DNS."
  default     = false
}

variable "dc_website_domain" {
  type        = string
  description = "Custom DC website domain to register. Will be ignored if register_domain is false."
  default     = null
}

variable "domain_yearly_price" {
  type        = string
  description = "The cost of the domain, must be an exact match. Ex: 12.00 USD"
  default     = "12.00 USD"
}

variable "is_dns_public" {
  type        = bool
  description = "DNS for the website domain. Please do not change this value."
  default     = true
}

variable "contact_phone_internaltional_format" {
  type        = string
  description = "Contact phone nubmer for domain in international format. Ex: +1.6502530000"
  default     = "+1.6502530000"
}

variable "contact_region_code" {
  type        = string
  description = "Contact region code(country equivalent) for the domain. Ex: US"
  default     = "US"
}

variable "contact_postal_code" {
  type        = string
  description = "Contact postal code for the domain. Ex: 94043 for Google"
  default     = "94043"
}

variable "contact_admin_area" {
  type        = string
  description = "Contact admin area(state equivalent) for the domain. Ex: CA"
  default     = "CA"
}

variable "contact_locality" {
  type        = string
  description = "Contact locality(city equivalent) for the domain. Ex: Mountain View"
  default     = "Mountain View"
}

variable "single_quoted_comma_separated_contact_addresses" {
  type        = string
  description = <<EOF
Contact addresses for the domain. Must be single quoted.

If there are more than 1 address, it must also be comma separated.

Ex1: '1600 Amphitheatre Pkwy'

Ex2: '1600 Amphitheatre Pkwy','1601 Amphitheatre Pkwy'
EOF
  default = "'1600 Amphitheatre Pkwy'"
}

variable "single_quoted_comma_separated_contact_recipients" {
  type        = string
  description = <<EOF
Contact names for the domain. Must be single quoted.

If there are more than 1 name, it must also be comma separated.

Ex1: 'Jane Doe'

Ex2: 'Jane Done','John Doe'
EOF
  default = "'Datacommons Team'"
}

variable "use_resource_suffix" {
  type        = bool
  description = "If true then add a random suffix to the ending of GCP resource names to avoid name collision."
  default     = false
}

variable "resource_bucket_location" {
  type        = string
  description = "The location of the resource buckets. Can either be regional or multi-regional."
  default     = "us"
}
