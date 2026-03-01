terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 4.51.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "gemini-api-key"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "gemini_api_key_version" {
  secret      = google_secret_manager_secret.gemini_api_key.id
  secret_data = var.gemini_api_key_value
}

resource "google_storage_bucket" "augmented_metadata_bucket" {
  name          = "${var.gcp_project_id}-augmented-metadata"
  location      = "US"
  force_destroy = true
}

resource "google_cloud_run_service" "metadata_augmenter" {
  name     = "metadata-augmenter-service"
  location = var.gcp_region

  template {
    spec {
      containers {
        image = "us-west1-docker.pkg.dev/datcom-ci/cloud-run-source-deploy/nl-metadata-image:${var.image_tag}"
        env {
          name  = "GEMINI_API_KEY_SECRET"
          value = "projects/${var.gcp_project_id}/secrets/${google_secret_manager_secret.gemini_api_key.secret_id}/versions/latest"
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_cloud_workflows_workflow" "data_augmentation_workflow" {
  name            = "data-augmentation-workflow"
  region          = var.gcp_region
  description     = "Workflow to fetch stats, augment metadata, and store in GCS."
  source_contents = format(<<EOF
- main:
    steps:
      - assign_time:
          assign:
            - now: ${sys.now()}
            - filename: ${"augmented_data_" + string(now.seconds) + ".json"}
      - CallCloudRun:
          call: http.post
          args:
              url: "%s"
              auth:
                  type: OIDC
              body:
                  "param": "value" # This needs to be defined based on the job's expectations
          result: cloudRunResult
      - StoreToGCS:
          call: http.post
          args:
              url: "https://storage.googleapis.com/upload/storage/v1/b/%s/o?uploadType=media&name=${filename}"
              auth:
                  type: OIDC
              headers:
                  "Content-Type": "application/json"
              body: ${cloudRunResult.body}
          result: gcsUploadResult
EOF
, google_cloud_run_service.metadata_augmenter.status[0].url, google_storage_bucket.augmented_metadata_bucket.name)
}

resource "google_discovery_engine_data_store" "custom_dc_data_store" {
  location        = var.gcp_region
  data_store_id   = "custom-dc-metadata"
  display_name    = "Custom DC Augmented Metadata"
  industry_vertical = "GENERIC"
  solution_types  = ["SOLUTION_TYPE_SEARCH"]
  content_config  = "UNSTRUCTURED_DOCUMENT"
}

resource "google_discovery_engine_app" "custom_dc_search_app" {
  location        = "global"
  app_id          = "custom-dc-nl-search"
  display_name    = "Custom DC NL Search"
  data_store_ids  = [google_discovery_engine_data_store.custom_dc_data_store.data_store_id]
  solution_type   = "SOLUTION_TYPE_SEARCH"
}

# Note on daily ingestion:
# The design doc mentions daily ingestion from GCS. There is no direct Terraform resource
# to configure scheduled ingestion for Discovery Engine. This typically needs to be
# implemented using a combination of other services, for example:
# 1. A Cloud Scheduler job that runs daily.
# 2. A Cloud Function or Cloud Run job triggered by the scheduler.
# 3. The function/job would then call the Discovery Engine API to import data from the GCS bucket.
# The import operation would point to "gs://${google_storage_bucket.augmented_metadata_bucket.name}/*".
