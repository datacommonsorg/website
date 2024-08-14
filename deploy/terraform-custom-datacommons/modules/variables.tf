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

# Variable definitions

# Required variables
variable "project_id" {
  description = "The GCP project ID where the Redis instance will be created"
  type        = string
}

variable "namespace" {
  description = "Prefix to apply to resource names for namespacing in a shared GCP account"
  type        = string
}

# Optional variables
# Optional: If blank will use generated data commons API key
variable "dc_api_key" {
  description = "Data Commons API Key"
  type        = string
  default     = null
}

# Optional: If blank will use generated maps API key
variable "maps_api_key" {
  description = "Google Maps API Key"
  type        = string
  default     = null
}

variable "region" {
  description = "The GCP region where project resources will be created"
  type        = string
  default     = "us-central1"
}

variable user_project_override {
  description = "Set to true to specify a quota / billing project with billing_project_id. Default: true."
  type        = bool
  default     = true
}

variable billing_project_id {
  description = "If user_project_override is set to true, will use this billing project id. Default: null (will use var.project_id as the billing project)"
  type        = bool
  default     = null
}

variable "vpc_network_name" {
  description = "VPC network name to use"
  type        = string
  default     = "default"
}

variable "vpc_network_subnet_name" {
  description = "VPC network subnet name to use"
  type        = string
  default     = "default"
}

variable "vpc_base_cidr_block" {
  description = "Base CIDR block to be subdivided for VPC connectors"
  type        = string
  default     = "10.8.0.0/24"
}

variable "redis_enabled" {
  description = "Enable redis instance in this deployment"
  type        = bool
  default     = true
}

variable "redis_instance_name" {
  description = "Name of the redis instance"
  type        = string
  default     = "datacommons-redis-instance"
}
variable "redis_memory_size_gb" {
  description = "The memory size for the Redis instance in GB"
  type        = number
  default     = 2
}

variable "redis_tier" {
  description = "The service tier for the Redis instance"
  type        = string
  default     = "STANDARD_HA"
}

variable "redis_location_id" {
  description = "Redis location id (zone)"
  type        = string
  default     = "us-central1-a"
}

variable "redis_alternative_location_id" {
  description = "Redis alternate location id (alternate zone)"
  type        = string
  default     = "us-central1-b"
}

variable "redis_replica_count" {
  description = "Redis reserved IP range"
  type        = number
  default     = 1
}

variable "mysql_instance_name" {
  description = "The name of the MySQL instance"
  type        = string
  default     = "datacommons-mysql-instance"
}

variable "mysql_database_version" {
  description = "The version of MySQL"
  type        = string
  default     = "MYSQL_8_0"
}

variable "mysql_cpu_count" {
  description = "Number of CPUs for the MySQL instance"
  type        = number
  default     = 2
}

# See https://cloud.google.com/sql/docs/mysql/instance-settings
# for valid memory values
variable "mysql_memory_size_mb" {
  description = "Memory size for the MySQL instance in MB"
  type        = number
  default     = 7680
}

variable "mysql_storage_size_gb" {
  description = "SSD storage size for the MySQL instance in GB"
  type        = number
  default     = 20
}

variable mysql_database_name {
  description = "MySQL database name"
  type        = string
  default     = "datacommons"
}

variable "mysql_user" {
  description = "The username for the MySQL instance"
  type        = string
  default     = "datacommons"
}

variable "mysql_deletion_protection" {
  description = "Mysql deletion protection"
  type        = bool
  default     = false
}

## Data Commons Cloud Run service variables
variable "dc_web_service_image" {
  description = "Container image for Cloud Run service"
  type        = string
  default     = "gcr.io/datcom-ci/datacommons-website-compose:latest"
}

variable "dc_web_service_cpu" {
  description = "CPU limit for the Data Commons service container"
  type        = string
  default     = "4"
}

variable "dc_web_service_memory" {
  description = "Memory limit for the Data Commons service container"
  type        = string
  default     = "16G"
}

variable "dc_data_job_image" {
  description = "The container image for the data job"
  type        = string
  default     = "gcr.io/datcom-ci/datacommons-data:latest"
}

variable "dc_data_job_cpu" {
  description = "CPU limit for the Data Commons data loading job"
  type        = string
  default     = "2"
}

variable "dc_data_job_memory" {
  description = "Memory limit for the Data Commons data loading job"
  type        = string
  default     = "8G"
}

variable "dc_api_hostname" {
  description = "Data Commons API hostname"
  type        = string
  default     = "api.datacommons.org"
}

variable "dc_api_protocol" {
  description = "Data Commons API protocol"
  type        = string
  default     = "https"
}

variable "dc_gcs_data_bucket_path_override" {
  description = "[Optional] Set a custom GCS data bucket path"
  type        = string
  default     = ""
}

variable "dc_gcs_data_bucket_location" {
  description = "Data Commons data bucket GCS location"
  type        = string
  default     = "US"
}

variable "make_dc_web_service_public" {
  description = "Whether to make the Data Commons Cloud Run service publicly accessible"
  type        = bool
  default     = true
}
