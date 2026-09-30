#!/bin/bash
# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -e

export MIXER_API_KEY=$DC_API_KEY

# If OUTPUT_DIR is not specified and the deprecated GCS_DATA_PATH is, use that as OUTPUT_DIR.
if [[ $OUTPUT_DIR == "" && $GCS_DATA_PATH != "" ]]; then
    echo "GCS Data Path: $GCS_DATA_PATH"
    echo "GCS_DATA_PATH is deprecated. Use OUTPUT_DIR instead."
    export OUTPUT_DIR=$GCS_DATA_PATH
fi

# Check for required variables.

if [[ $DC_API_KEY == "" ]]; then
  echo "DC_API_KEY not specified."
  exit 1
fi

if [[ $MAPS_API_KEY == "" ]]; then
  echo "MAPS_API_KEY not specified."
  exit 1
fi

if [[ $OUTPUT_DIR == "" ]]; then
    echo "OUTPUT_DIR not specified."
    exit 1
fi

echo "OUTPUT_DIR=$OUTPUT_DIR"

export IS_CUSTOM_DC=true
export USER_DATA_PATH=$OUTPUT_DIR

if [[ $USE_SQLITE == "true" ]]; then
    export SQLITE_PATH=$OUTPUT_DIR/datacommons/datacommons.db
    echo "SQLITE_PATH=$SQLITE_PATH"
fi

nginx -c /workspace/nginx.conf

# 1. Dynamically update feature flags for Website and Mixer
python3 update_dcp_flags.py

# Resolve Project ID across standard environment variables, or fall back to Compute/Cloud Run Metadata Server
GCP_PROJECT_ID=${GCP_PROJECT_ID:-${GOOGLE_CLOUD_PROJECT:-$PROJECT_ID}}
if [[ -z "$GCP_PROJECT_ID" ]]; then
    GCP_PROJECT_ID=$(python3 -c "import urllib.request; req = urllib.request.Request('http://metadata.google.internal/computeMetadata/v1/project/project-id', headers={'Metadata-Flavor': 'Google'}); print(urllib.request.urlopen(req).read().decode())" 2>/dev/null) || true
fi

if [[ -z "$GCP_PROJECT_ID" ]]; then
    echo "ERROR: GCP_PROJECT_ID (or GOOGLE_CLOUD_PROJECT / PROJECT_ID) not specified and could not be resolved from metadata."
    exit 1
fi

SPANNER_CONFIG_YAML="{project: \"$GCP_PROJECT_ID\", instance: \"$GCP_SPANNER_INSTANCE_ID\", database: \"$GCP_SPANNER_DATABASE_NAME\"}"
SPANNER_SEARCH_CONFIG_PATH=${SPANNER_SEARCH_CONFIG_PATH:-"/workspace/internal/server/spanner/spanner_config/dcp_default.yaml"}

# 2. Configure Mixer arguments (Spanner Graph + V2 API)
MIXER_ARGS=(
    "--agent_default_expand_topics=false"
    "--spanner_graph_info=$SPANNER_CONFIG_YAML"
    "--spanner_search_config_path=$SPANNER_SEARCH_CONFIG_PATH"
    "--use_spanner_graph=true"
    "--feature_flags_path=deploy/featureflags/dcp.yaml"
    "--host_project=$GCP_PROJECT_ID"
)

# 3. Enable Redis cache for Mixer if REDIS_HOST and REDIS_PORT are configured
if [[ -n "$REDIS_HOST" && -n "$REDIS_PORT" ]]; then
    REDIS_CONFIG_YAML="{instances: [{region: \"$REGION\", host: \"$REDIS_HOST\", port: \"$REDIS_PORT\"}]}"
    MIXER_ARGS+=(
        "--use_redis=true"
        "--redis_info=$REDIS_CONFIG_YAML"
    )
fi

# Start mixer.
echo "DEBUG: Starting Mixer with arguments: ${MIXER_ARGS[@]}"
/workspace/bin/mixer \
    --use_bigquery=false \
    --use_base_bigtable=false \
    --use_custom_bigtable=false \
    --use_branch_bigtable=false \
    --sqlite_path=$SQLITE_PATH \
    --use_sqlite=$USE_SQLITE \
    --use_cloudsql=$USE_CLOUDSQL \
    --cloudsql_instance=$CLOUDSQL_INSTANCE \
    --remote_mixer_domain=$DC_API_ROOT \
    "${MIXER_ARGS[@]}" &

# Start envoy.
envoy -l warning --config-path /workspace/esp/envoy-config.yaml &

# Start MCP server.
if [[ $ENABLE_MCP == "true" ]]; then
    echo "Starting MCP Server."
    # Wait for Mixer to be ready in background
    (
      # Ensure this subshell exits if the main script kills it
      trap "exit" INT TERM
      # Loop until Mixer /version endpoint returns 200
      wait_time=1
      # total wait time: 1+2+4+8+16+32*8 ~ 5 mins = ~13 retries
      retries_left=13
      while [[ "$(python3 -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8081/version', timeout=5).getcode())" 2>/dev/null || echo 0)" != "200" ]]; do
        if [[ $retries_left -le 0 ]]; then
          echo "Mixer failed to start after 5 minutes. MCP server will not start."
          exit 1
        fi

        echo "Mixer not ready yet. Retrying in ${wait_time}s... ($retries_left retries left)"
        sleep $wait_time
        wait_time=$((wait_time * 2))
        if [[ $wait_time -gt 32 ]]; then wait_time=32; fi
        retries_left=$((retries_left - 1))
      done
      echo "Mixer is ready."

      if [[ $DEBUG == "true" ]]; then
          echo "Starting MCP Server in debug mode."
      fi
      exec datacommons-mcp serve http --skip-api-key-validation --port 8082
    ) &
fi

# Start website server.
if [[ $DEBUG == "true" ]]; then
    echo "Starting Website Server in debug mode."
    python3 web_app.py 7070 &
else
    echo "Starting Website Server."
    gunicorn --log-level info --preload --timeout 1000 --bind 0.0.0.0:7070 -w 4 web_app:app &
fi

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
