output "gcs_bucket_name" {
  description = "The name of the GCS bucket for augmented metadata."
  value       = google_storage_bucket.augmented_metadata_bucket.name
}

output "cloud_run_service_url" {
  description = "The URL of the metadata augmenter Cloud Run service."
  value       = google_cloud_run_service.metadata_augmenter.status[0].url
}

output "workflow_name" {
  description = "The name of the data augmentation workflow."
  value       = google_cloud_workflows_workflow.data_augmentation_workflow.name
}

output "data_store_id" {
  description = "The ID of the Discovery Engine data store."
  value       = google_discovery_engine_data_store.custom_dc_data_store.data_store_id
}

output "search_app_id" {
  description = "The ID of the Discovery Engine search app."
  value       = google_discovery_engine_app.custom_dc_search_app.app_id
}
