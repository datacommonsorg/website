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

# Local variable definitions

locals {
  # Data Commons Data Bucket
  dc_gcs_data_bucket_path = var.dc_gcs_data_bucket_path_override != "" ? var.dc_gcs_data_bucket_path_override : "${var.namespace}-datacommons-data-${var.project_id}"
  # VPC Connector CIDR block
  vpc_connector_cidr = cidrsubnet(var.vpc_base_cidr_block, 4, 0)  # Generates the first /28 subnet from the /24 block

  # Use var.maps_api_key if set, otherwise use generated Maps API key
  maps_api_key = var.maps_api_key != null ? var.maps_api_key : google_apikeys_key.maps_api_key.key_string

  # Use var.billing_project_id if set, otherwise use project_id for billing
  billing_project_id = var.billing_project_id != null ? var.billing_project_id : var.project_id

  # Data Commons API root url
  dc_api_root = "${var.dc_api_protocol}://${var.dc_api_hostname}"

  # Shared environment variables used by the Data Commons web service and the Data
  # Commons data loading job
  cloud_run_shared_env_variables = [
    {
      name  = "USE_CLOUDSQL"
      value = "true"
    },
    {
      name  = "CLOUDSQL_INSTANCE"
      value = google_sql_database_instance.mysql_instance.connection_name
    },
    {
      name  = "DB_NAME"
      value = var.mysql_database_name
    },
    {
      name  = "DB_USER"
      value = var.mysql_user
    },
    {
      name  = "OUTPUT_DIR"
      value = "gs://${local.dc_gcs_data_bucket_path}/output"
    },
    {
      name  = "FORCE_RESTART"
      value = "${timestamp()}"
    }
  ]

  # Shared environment variables containing secret refs used by the Data Commons
  # web service and the Data Commons data loading job
  cloud_run_shared_env_variable_secrets = [
    {
      name  = "DC_API_KEY"
      value_source = {
        secret_key_ref = {
          secret = google_secret_manager_secret.dc_api_key.secret_id
          version  = "latest"
        }
      }
    },
    {
      name  = "DB_PASS"
      value_source = {
        secret_key_ref = {
          secret  = google_secret_manager_secret.mysql_password.secret_id
          version = "latest"
        }
      }
    }
  ]
}
