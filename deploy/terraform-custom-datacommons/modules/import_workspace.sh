#!/usr/bin/env bash
# import_workspace.sh — Import existing GCP resources into a Terraform workspace.
#
# Terraform state is stored locally (gitignored because it contains secrets).
# If state is ever lost, this script rebuilds it from the live GCP resources.
#
# Usage:
#   cd deploy/terraform-custom-datacommons/modules
#   terraform workspace select STAGING   # or PROD
#   bash import_workspace.sh staging     # or prod
#
# The script is idempotent: resources already in state are skipped.

set -euo pipefail

NAMESPACE="${1:?Usage: $0 <namespace>  (e.g. staging or prod)}"
PROJECT="one-data-commons"
PROJECT_NUMBER="650536812276"
REGION="northamerica-northeast1"

echo "═══════════════════════════════════════════════════════"
echo " Importing resources for namespace: ${NAMESPACE}"
echo " Project: ${PROJECT}"
echo " Region:  ${REGION}"
echo "═══════════════════════════════════════════════════════"
echo ""

# Helper: import a resource if not already in state
import_if_missing() {
  local tf_addr="$1"
  local gcp_id="$2"

  if terraform state show "$tf_addr" &>/dev/null; then
    echo "SKIP  $tf_addr (already in state)"
  else
    echo "IMPORT $tf_addr"
    terraform import "$tf_addr" "$gcp_id"
  fi
}

# ── Redis ─────────────────────────────────────────────────
# Only import if a Redis instance exists for this namespace
REDIS_NAME="${NAMESPACE}-datacommons-redis-instance"
if gcloud redis instances describe "$REDIS_NAME" --region="$REGION" --project="$PROJECT" &>/dev/null; then
  import_if_missing \
    'google_redis_instance.redis_instance[0]' \
    "projects/${PROJECT}/locations/${REGION}/instances/${REDIS_NAME}"
else
  echo "SKIP  google_redis_instance.redis_instance[0] (no Redis instance for ${NAMESPACE})"
fi

# ── Cloud SQL ─────────────────────────────────────────────
import_if_missing \
  google_sql_database_instance.mysql_instance \
  "${NAMESPACE}-datacommons-mysql-instance"

import_if_missing \
  google_sql_database.mysql_db \
  "${PROJECT}/${NAMESPACE}-datacommons-mysql-instance/datacommons"

# Cloud SQL user: import format is "project/instance/user"
import_if_missing \
  google_sql_user.mysql_user \
  "${PROJECT}/${NAMESPACE}-datacommons-mysql-instance/datacommons"

# ── Secrets Manager ───────────────────────────────────────
# Find the actual secret names (they include a random suffix)
MYSQL_SECRET=$(gcloud secrets list --project="$PROJECT" --filter="name~${NAMESPACE}-datacommons-mysql-password" --format="value(name)" | head -1)
if [ -n "$MYSQL_SECRET" ]; then
  import_if_missing \
    google_secret_manager_secret.mysql_password \
    "projects/${PROJECT}/secrets/${MYSQL_SECRET}"

  import_if_missing \
    google_secret_manager_secret_version.mysql_password_version \
    "projects/${PROJECT}/secrets/${MYSQL_SECRET}/versions/1"
fi

MAPS_SECRET=$(gcloud secrets list --project="$PROJECT" --filter="name~${NAMESPACE}-datacommons-maps-api-key" --format="value(name)" | head -1)
if [ -n "$MAPS_SECRET" ]; then
  import_if_missing \
    google_secret_manager_secret.maps_api_key \
    "projects/${PROJECT}/secrets/${MAPS_SECRET}"

  import_if_missing \
    google_secret_manager_secret_version.maps_api_key_version \
    "projects/${PROJECT}/secrets/${MAPS_SECRET}/versions/1"
fi

DC_SECRET=$(gcloud secrets list --project="$PROJECT" --filter="name~${NAMESPACE}-datacommons-dc-api-key" --format="value(name)" | head -1)
if [ -n "$DC_SECRET" ]; then
  import_if_missing \
    google_secret_manager_secret.dc_api_key \
    "projects/${PROJECT}/secrets/${DC_SECRET}"

  import_if_missing \
    google_secret_manager_secret_version.dc_api_key_version \
    "projects/${PROJECT}/secrets/${DC_SECRET}/versions/1"
fi

# ── Random resources ──────────────────────────────────────
# Extract the hex suffix from the maps secret name (e.g. "staging-datacommons-maps-api-key-05d10b5c" -> "05d10b5c")
if [ -n "$MAPS_SECRET" ]; then
  HEX_SUFFIX=$(echo "$MAPS_SECRET" | grep -oE '[0-9a-f]{8}$')
  if [ -n "$HEX_SUFFIX" ]; then
    import_if_missing \
      random_id.api_key_suffix \
      "$HEX_SUFFIX"
  fi
fi

import_if_missing \
  random_password.mysql_password \
  "none"

# ── GCS Bucket ────────────────────────────────────────────
BUCKET_NAME="${NAMESPACE}-datacommons-data-${PROJECT}"
import_if_missing \
  google_storage_bucket.gcs_data_bucket \
  "${BUCKET_NAME}"

# Bucket objects (empty folder markers) — skip, terraform will create them
echo "SKIP  google_storage_bucket_object.gcs_data_bucket_input_folder (empty folder marker)"
echo "SKIP  google_storage_bucket_object.gcs_data_bucket_output_folder (empty folder marker)"

# ── API Key ───────────────────────────────────────────────
# Find the maps API key by display name
MAPS_KEY_UID=$(gcloud services api-keys list --project="$PROJECT" --filter="displayName~${NAMESPACE}-maps-api-key" --format="value(uid)" | head -1)
if [ -n "$MAPS_KEY_UID" ]; then
  import_if_missing \
    google_apikeys_key.maps_api_key \
    "projects/${PROJECT_NUMBER}/locations/global/keys/${MAPS_KEY_UID}"
fi

# ── Cloud Run ─────────────────────────────────────────────
import_if_missing \
  google_cloud_run_v2_service.dc_web_service \
  "projects/${PROJECT}/locations/${REGION}/services/${NAMESPACE}-datacommons-web-service"

import_if_missing \
  'google_cloud_run_service_iam_member.dc_web_service_invoker[0]' \
  "projects/${PROJECT}/locations/${REGION}/services/${NAMESPACE}-datacommons-web-service/roles/run.invoker/allUsers"

import_if_missing \
  google_cloud_run_v2_job.dc_data_job \
  "projects/${PROJECT}/locations/${REGION}/jobs/${NAMESPACE}-datacommons-data-job"

# ── IAM ───────────────────────────────────────────────────
SA_EMAIL="${NAMESPACE}-datacommons-sa@${PROJECT}.iam.gserviceaccount.com"

import_if_missing \
  google_service_account.datacommons_service_account \
  "projects/${PROJECT}/serviceAccounts/${SA_EMAIL}"

# IAM bindings: format is "project role serviceAccount:email" (space-separated)
import_if_missing \
  'google_project_iam_member.secret_accessor' \
  "${PROJECT} roles/secretmanager.secretAccessor serviceAccount:${SA_EMAIL}"

import_if_missing \
  'google_project_iam_member.cloudsql_client' \
  "${PROJECT} roles/cloudsql.client serviceAccount:${SA_EMAIL}"

import_if_missing \
  'google_project_iam_member.storage_admin' \
  "${PROJECT} roles/storage.admin serviceAccount:${SA_EMAIL}"

import_if_missing \
  'google_project_iam_member.cloud_run_admin' \
  "${PROJECT} roles/run.admin serviceAccount:${SA_EMAIL}"

echo ""
echo "═══════════════════════════════════════════════════════"
echo " Import complete for namespace: ${NAMESPACE}"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  terraform plan -var-file=terraform.tfvars   # (or terraform_prod.tfvars)"
echo "  Review the plan to ensure no unexpected changes."
