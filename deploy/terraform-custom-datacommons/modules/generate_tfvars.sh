#!/usr/bin/env bash
# generate_tfvars.sh — Generate terraform.tfvars from live GCP resources.
#
# This script queries GCP for existing resource configurations and generates
# a tfvars file that matches the current deployment. Use this when setting up
# a new development environment or recovering lost tfvars.
#
# Usage:
#   bash generate_tfvars.sh staging   # generates terraform.tfvars
#   bash generate_tfvars.sh prod      # generates terraform_prod.tfvars
#
# Prerequisites:
#   - gcloud CLI authenticated with access to the project
#   - Existing deployed resources in GCP

set -euo pipefail

NAMESPACE="${1:?Usage: $0 <namespace>  (e.g. staging or prod)}"
PROJECT="one-data-commons"
REGION="northamerica-northeast1"

# Determine output file
if [ "$NAMESPACE" = "prod" ]; then
  OUTPUT_FILE="terraform_prod.tfvars"
else
  OUTPUT_FILE="terraform.tfvars"
fi

if [ -f "$OUTPUT_FILE" ]; then
  echo "Error: $OUTPUT_FILE already exists."
  echo "Remove it first or back it up before regenerating."
  exit 1
fi

echo "═══════════════════════════════════════════════════════"
echo " Generating $OUTPUT_FILE from live GCP resources"
echo " Namespace: ${NAMESPACE}"
echo " Project:   ${PROJECT}"
echo " Region:    ${REGION}"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── Query Cloud Run Service ──────────────────────────────────────────────────
SERVICE_NAME="${NAMESPACE}-datacommons-web-service"
echo "Querying Cloud Run service: $SERVICE_NAME..."

SERVICE_JSON=$(gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" \
  --project="$PROJECT" \
  --format=json 2>/dev/null || echo "{}")

if [ "$SERVICE_JSON" = "{}" ]; then
  echo "  Warning: Service not found, using defaults"
  DC_CPU="4"
  DC_MEMORY="16G"
  DC_IMAGE="us-east4-docker.pkg.dev/one-data-commons/datacommons/website-compose:latest"
  CPU_IDLE="true"
else
  DC_CPU=$(echo "$SERVICE_JSON" | jq -r '.spec.template.spec.containers[0].resources.limits.cpu // "4"')
  DC_MEMORY=$(echo "$SERVICE_JSON" | jq -r '.spec.template.spec.containers[0].resources.limits.memory // "16G"')
  DC_IMAGE=$(echo "$SERVICE_JSON" | jq -r '.spec.template.spec.containers[0].image // "us-east4-docker.pkg.dev/one-data-commons/datacommons/website-compose:latest"')
  CPU_THROTTLING=$(echo "$SERVICE_JSON" | jq -r '.spec.template.metadata.annotations["run.googleapis.com/cpu-throttling"] // "true"')
  if [ "$CPU_THROTTLING" = "false" ]; then
    CPU_IDLE="false"
  else
    CPU_IDLE="true"
  fi
  echo "  CPU: $DC_CPU, Memory: $DC_MEMORY, CPU Idle: $CPU_IDLE"
fi

# ── Query Cloud Run Job ──────────────────────────────────────────────────────
JOB_NAME="${NAMESPACE}-datacommons-data-job"
echo "Querying Cloud Run job: $JOB_NAME..."

JOB_JSON=$(gcloud run jobs describe "$JOB_NAME" \
  --region="$REGION" \
  --project="$PROJECT" \
  --format=json 2>/dev/null || echo "{}")

if [ "$JOB_JSON" = "{}" ]; then
  echo "  Warning: Job not found, using defaults"
  JOB_CPU="4"
  JOB_MEMORY="16G"
  JOB_TIMEOUT="5400s"
  JOB_IMAGE="gcr.io/datcom-ci/datacommons-data:latest"
else
  JOB_CPU=$(echo "$JOB_JSON" | jq -r '.spec.template.template.containers[0].resources.limits.cpu // "4"')
  JOB_MEMORY=$(echo "$JOB_JSON" | jq -r '.spec.template.template.containers[0].resources.limits.memory // "16G"')
  JOB_TIMEOUT=$(echo "$JOB_JSON" | jq -r '.spec.template.template.timeout // "5400s"')
  JOB_IMAGE=$(echo "$JOB_JSON" | jq -r '.spec.template.template.containers[0].image // "gcr.io/datcom-ci/datacommons-data:latest"')
  echo "  CPU: $JOB_CPU, Memory: $JOB_MEMORY, Timeout: $JOB_TIMEOUT"
fi

# ── Query Redis ──────────────────────────────────────────────────────────────
REDIS_NAME="${NAMESPACE}-datacommons-redis-instance"
echo "Querying Redis instance: $REDIS_NAME..."

REDIS_JSON=$(gcloud redis instances describe "$REDIS_NAME" \
  --region="$REGION" \
  --project="$PROJECT" \
  --format=json 2>/dev/null || echo "{}")

if [ "$REDIS_JSON" = "{}" ]; then
  # No Redis for this namespace - check if prod shares staging's Redis
  if [ "$NAMESPACE" = "prod" ]; then
    echo "  Prod shares staging Redis, querying staging-datacommons-redis-instance..."
    STAGING_REDIS_JSON=$(gcloud redis instances describe "staging-datacommons-redis-instance" \
      --region="$REGION" \
      --project="$PROJECT" \
      --format=json 2>/dev/null || echo "{}")
    if [ "$STAGING_REDIS_JSON" != "{}" ]; then
      ENABLE_REDIS="false"
      REDIS_HOST=$(echo "$STAGING_REDIS_JSON" | jq -r '.host')
      REDIS_PORT=$(echo "$STAGING_REDIS_JSON" | jq -r '.port // "6379"')
      SHARED_REDIS="true"
      echo "  Using shared Redis: $REDIS_HOST:$REDIS_PORT"
    else
      echo "  Warning: No Redis found, using defaults"
      ENABLE_REDIS="true"
      REDIS_LOCATION="northamerica-northeast1-a"
      REDIS_ALT_LOCATION="northamerica-northeast1-b"
      SHARED_REDIS="false"
    fi
  else
    echo "  Warning: Redis not found, will be created"
    ENABLE_REDIS="true"
    REDIS_LOCATION="northamerica-northeast1-a"
    REDIS_ALT_LOCATION="northamerica-northeast1-b"
    SHARED_REDIS="false"
  fi
else
  ENABLE_REDIS="true"
  REDIS_LOCATION=$(echo "$REDIS_JSON" | jq -r '.locationId // "northamerica-northeast1-a"')
  REDIS_ALT_LOCATION=$(echo "$REDIS_JSON" | jq -r '.alternativeLocationId // "northamerica-northeast1-b"')
  SHARED_REDIS="false"
  echo "  Location: $REDIS_LOCATION, Alt: $REDIS_ALT_LOCATION"
fi

# ── Query Secrets for DC API Key ─────────────────────────────────────────────
echo "Querying DC API key from Secret Manager..."

DC_SECRET_NAME=$(gcloud secrets list --project="$PROJECT" \
  --filter="name~${NAMESPACE}-datacommons-dc-api-key" \
  --format="value(name)" | head -1)

if [ -n "$DC_SECRET_NAME" ]; then
  DC_API_KEY=$(gcloud secrets versions access latest \
    --secret="$DC_SECRET_NAME" \
    --project="$PROJECT" 2>/dev/null || echo "")
  if [ -n "$DC_API_KEY" ]; then
    echo "  Found DC API key in secret: $DC_SECRET_NAME"
  else
    echo "  Warning: Could not read DC API key, using placeholder"
    DC_API_KEY="YOUR_DC_API_KEY"
  fi
else
  echo "  Warning: DC API key secret not found, using placeholder"
  DC_API_KEY="YOUR_DC_API_KEY"
fi

# ── Query Cloud SQL ──────────────────────────────────────────────────────────
MYSQL_NAME="${NAMESPACE}-datacommons-mysql-instance"
echo "Querying Cloud SQL instance: $MYSQL_NAME..."

MYSQL_JSON=$(gcloud sql instances describe "$MYSQL_NAME" \
  --project="$PROJECT" \
  --format=json 2>/dev/null || echo "{}")

if [ "$MYSQL_JSON" = "{}" ]; then
  echo "  Warning: MySQL not found, using defaults"
  MYSQL_DELETION_PROTECTION="true"
else
  DELETION_PROTECTION=$(echo "$MYSQL_JSON" | jq -r '.settings.deletionProtectionEnabled // true')
  if [ "$DELETION_PROTECTION" = "true" ]; then
    MYSQL_DELETION_PROTECTION="true"
  else
    MYSQL_DELETION_PROTECTION="false"
  fi
  echo "  Deletion protection: $MYSQL_DELETION_PROTECTION"
fi

# ── Generate tfvars file ─────────────────────────────────────────────────────
echo ""
echo "Writing $OUTPUT_FILE..."

cat > "$OUTPUT_FILE" << EOF
# ONE Data Commons — ${NAMESPACE^^} Terraform Variables
# Generated from live GCP resources on $(date +%Y-%m-%d)
#
# See variables.tf for all available options and defaults.

# ── Required ─────────────────────────────────────────────────────────────────

project_id = "$PROJECT"
namespace = "$NAMESPACE"
dc_api_key = "$DC_API_KEY"

# ── Region ───────────────────────────────────────────────────────────────────

region = "$REGION"

# ── Cloud Run Service ────────────────────────────────────────────────────────

dc_web_service_image = "$DC_IMAGE"
dc_web_service_cpu = "$DC_CPU"
dc_web_service_memory = "$DC_MEMORY"
dc_web_service_cpu_idle = $CPU_IDLE

# ── Cloud Run Job ────────────────────────────────────────────────────────────

dc_data_job_image = "$JOB_IMAGE"
dc_data_job_timeout = "$JOB_TIMEOUT"
dc_data_job_cpu = "$JOB_CPU"
dc_data_job_memory = "$JOB_MEMORY"

# ── Redis ────────────────────────────────────────────────────────────────────

enable_redis = $ENABLE_REDIS
EOF

# Add Redis config based on whether it's shared or not
if [ "${SHARED_REDIS:-false}" = "true" ]; then
  cat >> "$OUTPUT_FILE" << EOF
redis_host = "$REDIS_HOST"
redis_port = "$REDIS_PORT"
EOF
else
  cat >> "$OUTPUT_FILE" << EOF
redis_location_id = "$REDIS_LOCATION"
redis_alternative_location_id = "$REDIS_ALT_LOCATION"
EOF
fi

cat >> "$OUTPUT_FILE" << EOF

# ── Database ─────────────────────────────────────────────────────────────────

mysql_deletion_protection = $MYSQL_DELETION_PROTECTION
EOF

echo ""
echo "═══════════════════════════════════════════════════════"
echo " Generated $OUTPUT_FILE"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Review the generated file and adjust as needed"
echo "  2. Import terraform state:  bash import_workspace.sh $NAMESPACE"
echo "  3. Verify with:  terraform plan -var-file=$OUTPUT_FILE"
