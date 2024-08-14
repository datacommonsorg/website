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
  depends_on = [google_project_service.compute]
}

# Reference the default subnet in the specified region
data "google_compute_subnetwork" "default_subnet" {
  name   = var.vpc_network_subnet_name
  region = var.region
  depends_on = [google_project_service.compute]
}

# Create redis instance
resource "google_redis_instance" "redis_instance" {
  count           = var.redis_enabled ? 1 : 0
  name           = "${var.namespace}-${var.redis_instance_name}"
  tier           = var.redis_tier
  memory_size_gb = var.redis_memory_size_gb
  region         = var.region
  location_id    = var.redis_location_id
  alternative_location_id = var.redis_alternative_location_id
  reserved_ip_range = var.redis_reserved_ip_range
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

resource "random_password" "mysql_password" {
  length  = 16
  special = true
}

resource "google_sql_database" "mysql_db" {
  name     = var.mysql_database_name
  instance = google_sql_database_instance.mysql_instance.name
  charset  = "utf8mb4"
  collation = "utf8mb4_unicode_ci"
}

resource "google_sql_user" "mysql_user" {
  name     = var.mysql_user
  instance = google_sql_database_instance.mysql_instance.name
  password = random_password.mysql_password.result
}

# Data commons storage bucket
resource "google_storage_bucket" "dc_gcs_data_bucket" {
  name     = local.dc_gcs_data_bucket_path
  location = var.dc_gcs_data_bucket_location
  uniform_bucket_level_access = true
}

# Google Maps API key
resource "google_apikeys_key" "maps_api_key" {
  name         = "${var.namespace}-maps-api-key"
  display_name = "${var.namespace}-maps-api-key"
  project      = var.project_id

  restrictions {
    api_targets {
      service = "maps_backend"
    }
    api_targets {
      service = "places_backend"
    }
  }
  depends_on = [
    google_project_service.apikeys
  ]
}

# Data Commons API key
resource "google_apikeys_key" "datacommons_api_key" {
  name         = "${var.namespace}-datacommons-api-key"
  display_name = "${var.namespace}-datacommons-api-key"
  project      = var.project_id

  restrictions {
    api_targets {
      service = "api.datacommons.org"
    }
  }
  depends_on = [
    google_project_service.apikeys
  ]
}

# Data Commons Cloud Run Service
resource "google_cloud_run_v2_service" "dc_web_service" {
  name     = "${var.namespace}-datacommons-web-service"
  location = var.region

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

      env {
        name  = "DC_API_KEY"
        value = local.dc_api_key
      }

      env {
        name  = "USE_CLOUDSQL"
        value = "true"
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "DC_API_ROOT"
        value = var.dc_api_root
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
        name  = "MAPS_API_KEY"
        value = local.maps_api_key
      }

      env {
        name  = "ENABLE_MODEL"
        value = "true"
      }

      env {
        name  = "CLOUDSQL_INSTANCE"
        value = google_sql_database_instance.mysql_instance.connection_name
      }

      env {
        name = "DB_NAME"
        value = var.mysql_database_name
      }

      env {
        name  = "DB_USER"
        value = var.mysql_user
      }

      env {
        name  = "DB_PASS"
        value = random_password.mysql_password.result
      }

      env {
        name = "REDIS_HOST"
        value = var.redis_enabled != null  ? google_redis_instance.redis_instance[0].host : ""
      }

      env {
        name  = "GCS_DATA_PATH"
        value = local.dc_gcs_data_bucket_path
      }

      env {
        name  = "FORCE_RESTART"
        value = "${timestamp()}"  # Add a dummy environment variable to force restart
      }

      startup_probe {
        http_get {
          path = "/healthz"
          port = 8080
        }
        initial_delay_seconds = 60
        period_seconds        = 30
        timeout_seconds       = 5
        failure_threshold     = 5
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
      min_instance_count = 1
      max_instance_count = 1
    }
    service_account = google_service_account.datacommons_service_account.email
  }
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

        env {
          name  = "USE_CLOUDSQL"
          value = "true"
        }

        env {
          name  = "DC_API_KEY"
          value = local.dc_api_key
        }

        env {
          name  = "INPUT_DIR"
          value = "gs://${local.dc_gcs_data_bucket_path}/input"  # Fixed variable reference
        }

        env {
          name  = "OUTPUT_DIR"
          value = "gs://${local.dc_gcs_data_bucket_path}/output"  # Fixed variable reference
        }

        env {
          name  = "CLOUDSQL_INSTANCE"
          value = google_sql_database_instance.mysql_instance.connection_name
        }

        env {
          name  = "DB_NAME"
          value = var.mysql_database_name
        }

        env {
          name  = "DB_USER"
          value = var.mysql_user
        }

        env {
          name  = "DB_PASS"
          value = random_password.mysql_password.result
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
}