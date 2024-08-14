output "redis_instance_host" {
  description = "The hostname or IP address of the Redis instance"
  value       = var.redis_enabled ? google_redis_instance.redis_instance[0].host : ""
}

output "redis_instance_port" {
  description = "The port number the Redis instance is listening on"
  value       = var.redis_enabled ? google_redis_instance.redis_instance[0].port : null
}

output "mysql_instance_connection_name" {
  description = "The connection name of the MySQL instance"
  value       = google_sql_database_instance.mysql_instance.connection_name
}

output "mysql_instance_public_ip" {
  description = "The public IP address of the MySQL instance"
  value       = google_sql_database_instance.mysql_instance.public_ip_address
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
  value       = local.dc_api_key
  sensitive = true
}

output "maps_api_key" {
  description = "Maps API key"
  value       = local.maps_api_key
  sensitive = true
}