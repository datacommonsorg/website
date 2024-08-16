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

output "redis_instance_host" {
  description = "The hostname or IP address of the Redis instance"
  value       = var.enable_redis ? google_redis_instance.redis_instance[0].host : ""
}

output "redis_instance_port" {
  description = "The port number the Redis instance is listening on"
  value       = var.enable_redis ? google_redis_instance.redis_instance[0].port : null
}

output "mysql_instance_connection_name" {
  description = "The connection name of the MySQL instance"
  value       = google_sql_database_instance.mysql_instance.connection_name
}

output "mysql_instance_public_ip" {
  description = "The public IP address of the MySQL instance"
  value       = google_sql_database_instance.mysql_instance.public_ip_address
}

output "mysql_user" {
  description = "MySQL user name"
  value       = var.mysql_user
  sensitive   = true
}

output "mysql_user_password" {
  description = "The password for the MySQL user"
  value       = random_password.mysql_password.result
  sensitive   = true
}

output "dc_gcs_data_bucket_path" {
  value = local.dc_gcs_data_bucket_path
}

output "cloud_run_service_name" {
  description = "Name of the Data Commons Cloud Run Web service"
  value       = google_cloud_run_v2_service.dc_web_service.name
}

output "cloud_run_service_url" {
  description = "URL of the Data Commons Cloud Run Web service"
  value       = google_cloud_run_v2_service.dc_web_service.uri
}

output "dc_api_key" {
  description = "Data Commons API key"
  value       = var.dc_api_key
  sensitive = true
}

output "maps_api_key" {
  description = "Maps API key"
  value       = local.maps_api_key
  sensitive = true
}