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

# Custom Data Commons terraform resources

provider "google" {
  project = var.project_id
  region  = var.region
  user_project_override = var.user_project_override
  billing_project = local.billing_project_id
}

# Reference the default VPC network
data "google_compute_network" "default" {
  name = var.vpc_network_name
}

# Reference the default subnet in the specified region
data "google_compute_subnetwork" "default_subnet" {
  name   = var.vpc_network_subnet_name
  region = var.region
}

# Create redis instance
resource "google_redis_instance" "redis_instance" {
  count           = var.enable_redis ? 1 : 0
  name           = "${var.namespace}-${var.redis_instance_name}"
  tier           = var.redis_tier
  memory_size_gb = var.redis_memory_size_gb
  region         = var.region
  location_id    = var.redis_location_id
  alternative_location_id = var.redis_alternative_location_id
  authorized_network = data.google_compute_network.default.self_link
  replica_count = var.redis_replica_count
}

# Create MySQL instance
resource "google_sql_database_instance" "mysql_instance" {
  name             = "${var.namespace}-${var.mysql_instance_name}"
  database_version = var.mysql_database_version
  region           = var.region

  settings {
    tier = "db-custom-${var.mysql_cpu_count}-${var.mysql_memory_size_mb}"

    backup_configuration {
      enabled = true
      backup_retention_settings {
        retained_backups = 7
      }
    }

    ip_configuration {
      ipv4_enabled = true
    }

    disk_size = var.mysql_storage_size_gb
    disk_type = "PD_SSD"
  }

  deletion_protection = var.mysql_deletion_protection
}

# Generate random mysql password
resource "random_password" "mysql_password" {
  length  = 16
  special = true
}

# Store password in the secrets manager
resource "google_secret_manager_secret" "mysql_password" {
  secret_id = "${var.namespace}-datacommons-mysql-password"
  replication {
    auto {}
  }
}

# Version the mysql password in the secrets manager
resource "google_secret_manager_secret_version" "mysql_password_version" {
  secret      = google_secret_manager_secret.mysql_password.id
  secret_data = random_password.mysql_password.result
}

resource "google_sql_database" "mysql_db" {
  name     = var.mysql_database_name
  instance = google_sql_database_instance.mysql_instance.name
  charset  = "utf8mb4"
  collation = "utf8mb4_unicode_ci"
}

resource "google_sql_user" "mysql_user" {
  name     = var.mysql_user
  host     = "%"
  instance = google_sql_database_instance.mysql_instance.name
  password = random_password.mysql_password.result
}

# Data commons storage bucket
resource "google_storage_bucket" "gcs_data_bucket" {
  name     = local.gcs_data_bucket_name
  location = var.gcs_data_bucket_location
  uniform_bucket_level_access = true
}

# Input 'folder' for the data loading job.
resource "google_storage_bucket_object" "gcs_data_bucket_input_folder" {
  name          = "${var.gcs_data_bucket_input_folder}/"
  content       = "Input folder"
  bucket        = "${google_storage_bucket.gcs_data_bucket.name}"
}

# Output 'folder' for the data loading job.
resource "google_storage_bucket_object" "gcs_data_bucket_output_folder" {
  name          = "${var.gcs_data_bucket_output_folder}/"
  content       = "Output folder"
  bucket        = "${google_storage_bucket.gcs_data_bucket.name}"
}

# Generate a random suffix to append to api keys.
# A deleted API key fully expires 30 days after deletion, and in the 30-day
# window the ID remains taken. This suffix allows terraform to give API
# keys a unique name if the stack is destroyed and rebuilt
resource "random_id" "api_key_suffix" {
  byte_length = 4
}

# Google Maps API key
resource "google_apikeys_key" "maps_api_key" {
  name         = "${var.namespace}-maps-api-key-${random_id.api_key_suffix.hex}"
  display_name = "${var.namespace}-maps-api-key-${random_id.api_key_suffix.hex}"
  project      = var.project_id

  restrictions {
    api_targets {
      service = "maps_backend"
    }
    api_targets {
      service = "places_backend"
    }
  }
}

# Store maps api key in the secrets manager
resource "google_secret_manager_secret" "maps_api_key" {
  secret_id = "${var.namespace}-datacommons-maps-api-key-${random_id.api_key_suffix.hex}"
  replication {
    auto {}
  }
}

# Version the maps api key in the secrets manager
resource "google_secret_manager_secret_version" "maps_api_key_version" {
  secret      = google_secret_manager_secret.maps_api_key.id
  secret_data = local.maps_api_key
}

# Store Data Commons api key in the secrets manager
resource "google_secret_manager_secret" "dc_api_key" {
  secret_id = "${var.namespace}-datacommons-dc-api-key-${random_id.api_key_suffix.hex}"
  replication {
    auto {}
  }
}

# Version the Data Commons api key in the secrets manager
resource "google_secret_manager_secret_version" "dc_api_key_version" {
  secret      = google_secret_manager_secret.dc_api_key.id
  secret_data = var.dc_api_key
}

# Data Commons Cloud Run Service
resource "google_cloud_run_v2_service" "dc_web_service" {
  name     = "${var.namespace}-datacommons-web-service"
  location = var.region
  deletion_protection = false

  template {
    containers {
      image = var.dc_web_service_image

      ports {
        container_port = 8080
      }

      resources {
        cpu_idle = false
        limits = {
          cpu    = var.dc_web_service_cpu
          memory = var.dc_web_service_memory
        }
        startup_cpu_boost = true
      }

      # Shared environment variables
      dynamic "env" {
        for_each = local.cloud_run_shared_env_variables
        content {
          name  = env.value.name
          value = env.value.value
        }
      }

      # Shared environment variables with secret refs
      dynamic "env" {
        for_each = local.cloud_run_shared_env_variable_secrets
        content {
          name  = env.value.name
          value_source {
            secret_key_ref {
              secret = env.value.value_source.secret_key_ref.secret
              version = env.value.value_source.secret_key_ref.version
            }            
          }
        }
      }

      env {
        name = "GOOGLE_ANALYTICS_TAG_ID"
        value = var.google_analytics_tag_id != null ? var.google_analytics_tag_id : ""
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "DC_API_ROOT"
        value = local.dc_api_root
      }

      env {
        name  = "ADMIN_SECRET"
        value = ""
      }

      env {
        name  = "FLASK_ENV"
        value = "custom"
      }

      env {
        name  = "ENABLE_MODEL"
        value = "true"
      }

      env {
        name = "REDIS_HOST"
        value = var.enable_redis ? google_redis_instance.redis_instance[0].host : ""
      }

      env {
        name  = "MAPS_API_KEY"
        value_source {
          secret_key_ref {
            secret = google_secret_manager_secret.maps_api_key.secret_id
            version  = "latest"
          }
        }
      }

      startup_probe {
        http_get {
          path = "/healthz"
          port = 8080
        }
        initial_delay_seconds = 60
        period_seconds        = 10
        timeout_seconds       = 5
        failure_threshold     = 15
      }

      liveness_probe {
        http_get {
          path = "/healthz"
          port = 8080
        }
        initial_delay_seconds = 240
        period_seconds        = 30
        timeout_seconds       = 5
        failure_threshold     = 3
      }
    }

    max_instance_request_concurrency = 80

    vpc_access {
      network_interfaces {
        network = data.google_compute_network.default.id
        subnetwork  = data.google_compute_subnetwork.default_subnet.name
      }
      egress = "PRIVATE_RANGES_ONLY"
    }
    scaling {
      min_instance_count = var.dc_web_service_min_instance_count
      max_instance_count = var.dc_web_service_max_instance_count
    }
    service_account = google_service_account.datacommons_service_account.email
  }

  labels = {
    namespace = var.namespace
    service   = "datacommons-web-service"
  }

  depends_on = [
    google_sql_database_instance.mysql_instance,
    google_secret_manager_secret_version.mysql_password_version,
    google_secret_manager_secret_version.dc_api_key_version,
    google_secret_manager_secret_version.maps_api_key_version,
    null_resource.run_db_init
  ]
}

# Make the Data Commons Cloud Run service publicly accessible
resource "google_cloud_run_service_iam_member" "dc_web_service_invoker" {
  count    = var.make_dc_web_service_public ? 1 : 0
  service  = google_cloud_run_v2_service.dc_web_service.name
  location = google_cloud_run_v2_service.dc_web_service.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Data Commons data loading job
resource "google_cloud_run_v2_job" "dc_data_job" {
  name     = "${var.namespace}-datacommons-data-job"
  location = var.region
  deletion_protection = false

  template { 
    template {
      containers {
        image = var.dc_data_job_image

        resources {
          limits = {
            cpu    = var.dc_data_job_cpu
            memory = var.dc_data_job_memory
          }
        }

        # Shared environment variables
        dynamic "env" {
          for_each = local.cloud_run_shared_env_variables
          content { 
            name  = env.value.name
            value = env.value.value
          }
        }

        # Shared environment variables with secret refs
        dynamic "env" {
          for_each = local.cloud_run_shared_env_variable_secrets
          content {
            name  = env.value.name
            value_source {
              secret_key_ref {
                secret = env.value.value_source.secret_key_ref.secret
                version = env.value.value_source.secret_key_ref.version
              }            
            }
          }
        }

        env {
          name  = "INPUT_DIR"
          value = "gs://${local.gcs_data_bucket_name}/${var.gcs_data_bucket_input_folder}"
        }
      }
      execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
      service_account = google_service_account.datacommons_service_account.email
    }
  }

  labels = {
    namespace = var.namespace
    service   = "datacommons-data-job"
  }

  depends_on = [
    google_secret_manager_secret_version.mysql_password_version,
    google_secret_manager_secret_version.dc_api_key_version,
    google_secret_manager_secret_version.maps_api_key_version
  ]
}

# Run the db init job on terraform apply
resource "null_resource" "run_db_init" {
  depends_on = [
    google_cloud_run_v2_job.dc_data_job,
    google_sql_database_instance.mysql_instance
  ]

  # Force the db init job to be run on each terraform apply
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<EOT
      # 1) Execute the schema update / initializationjob
      gcloud run jobs execute ${var.namespace}-datacommons-data-job \
        --update-env-vars DATA_RUN_MODE=schemaupdate \
        --region=${var.region} \
        --project=${var.project_id}

      # 2) Wait for the job to complete
      gcloud run jobs wait ${var.namespace}-datacommons-data-job \
        --region=${var.region} \
        --project=${var.project_id}
    EOT
  }
}
