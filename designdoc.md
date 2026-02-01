Vertex AI Search Integration for Custom DataCommons
1. Introduction
This document outlines the scope and proposed timeline for integrating Vertex AI Search into Custom DataCommons (DC) projects. The primary goal is to enhance Natural Language (NL) support by leveraging Vertex AI Search's capabilities for metadata augmentation and efficient data retrieval. This will involve the creation of a Terraform script to automate the deployment and configuration of the necessary Google Cloud Platform (GCP) resources across customer projects.
2. Solution Overview
The proposed solution involves a GCP Workflow that orchestrates the following steps:

Cloud Run Job Execution: One or more Cloud Run jobs will be triggered to fetch statistical variables relevant to the Custom DC.
Gemini API Integration: The Cloud Run jobs will call the Gemini API, using a securely stored API key in Google Secret Manager, to augment the fetched metadata.
Data Storage: The augmented metadata will be stored in a Google Cloud Storage (GCS) bucket.
Vertex AI Search Data Store Configuration: A Vertex AI Search Data Store will be configured to ingest data daily from the designated GCS bucket.
Vertex AI Search Application: A Vertex AI Search Application will be connected to the configured Data Store to provide enhanced NL search capabilities.

All these configurations will be automated via a Terraform script, ensuring consistency and ease of deployment across multiple customer GCP projects. An existing Artifact Registry image for the binary used in the Cloud Run jobs will be leveraged.
3. Work Breakdown and Estimated Timeline
3.1. Phase 1: Workflow and Cloud Run Development (2 Weeks)
Task
Estimated Time (Days)
Design GCP Workflow
2
Develop Cloud Run job for statistical data
3
Implement Gemini API call and metadata augmentation
4
Integrate Secret Manager for Gemini API key
2
Develop Cloud Run deployment script
1
Testing and debugging
3


Pseudo-code for Cloud Run Deployment (Terraform):

resource "google_cloud_run_service" "metadata_augmenter" {
  name     = "metadata-augmenter-service"
  location = var.gcp_region

  template {
    spec {
      containers {
        image = "gcr.io/${var.gcp_project_id}/artifact-registry/metadata-augmenter:${var.image_tag}"
        env {
          name  = "GEMINI_API_KEY_SECRET"
          value = "projects/${var.gcp_project_id}/secrets/${google_secret_manager_secret.gemini_api_key.secret_id}/versions/latest"
        }
        # Add other environment variables as needed
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_cloud_workflows_workflow" "data_augmentation_workflow" {
  name        = "data-augmentation-workflow"
  region      = var.gcp_region
  description = "Workflow to fetch stats, augment metadata, and store in GCS."

  source_contents = <<EOF
  - CallCloudRun:
      call: http.post
      args:
          url: ${google_cloud_run_service.metadata_augmenter.status[0].url}
          body:
              # Input parameters for the Cloud Run job
      result: cloudRunResult
  - StoreToGCS:
      call: http.post
      args:
          url: "https://storage.googleapis.com/upload/storage/v1/b/${google_storage_bucket.augmented_metadata_bucket.name}/o?uploadType=media&name=augmented_data_${time.rfc3339}.json"
          headers:
              Content-Type: application/json
          body: ${cloudRunResult.body}
      result: gcsUploadResult
  EOF
}

resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "gemini-api-key"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "gemini_api_key_version" {
  secret      = google_secret_manager_secret.gemini_api_key.id
  secret_data = var.gemini_api_key_value # Sensitive data, loaded from TF var or other secure source
}

resource "google_storage_bucket" "augmented_metadata_bucket" {
  name          = "${var.gcp_project_id}-augmented-metadata"
  location      = "US"
  force_destroy = true
}
3.2. Phase 2: Vertex AI Search Configuration (2 Weeks)
Task
Estimated Time (Days)
Design Vertex AI Search Data Store schema
2
Develop Terraform for Data Store creation
3
Configure daily ingestion from GCS
3
Develop Terraform for Vertex AI Search App
3
Connect Search App to Data Store
1
Testing and validation
3


Pseudo-code for Vertex AI Search Configuration (Terraform):

resource "google_vertex_ai_search_data_store" "custom_dc_data_store" {
  location    = var.gcp_region
  display_name = "Custom DC Augmented Metadata"
  project     = var.gcp_project_id
  data_store_id = "custom-dc-metadata"
  data_store_type = "COMMERCE_DATAMAP" # Or other relevant type based on schema
  solution_types = ["SEARCH"]

  # Schema definition can be provided here or referenced from a separate file
  # Example:
  # schema = file("schemas/custom_dc_schema.json")
}

resource "google_vertex_ai_search_data_store_import_config" "daily_ingestion" {
  data_store = google_vertex_ai_search_data_store.custom_dc_data_store.id
  input_config {
    gcs_source {
      input_uris = ["gs://${google_storage_bucket.augmented_metadata_bucket.name}/*"]
    }
  }
  schedule_interval = "24h" # Daily ingestion
}

resource "google_vertex_ai_search_engine" "custom_dc_search_engine" {
  location    = var.gcp_region
  display_name = "Custom DC NL Search"
  project     = var.gcp_project_id
  data_store_ids = [google_vertex_ai_search_data_store.custom_dc_data_store.id]
  engine_id   = "custom-dc-nl-search"
  solution_type = "SEARCH"
}
3.3. Phase 3: Overall Terraform Scripting and Deployment (2 Weeks)
Task
Estimated Time (Days)
Consolidate Terraform modules
4
Implement project-level permissions and IAM
3
Develop deployment pipeline (CI/CD)
3
End-to-end testing and validation
3
Documentation and handover
2

4. Rough Timeline
The estimated total time for this project is approximately 6 weeks.

Weeks 1-2: Workflow and Cloud Run Development
Weeks 3-4: Vertex AI Search Configuration
Weeks 5-6: Overall Terraform Scripting and Deployment
5. Next Steps
Detailed schema definition for the Vertex AI Search Data Store.
Refinement of Cloud Run job logic and statistical variable fetching.
Review and approval of the proposed architecture and timeline.
Kick-off meeting with the development team.


