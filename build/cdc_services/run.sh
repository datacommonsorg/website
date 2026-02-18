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
# https://stackoverflow.com/a/62703850
export TOKENIZERS_PARALLELISM=false
# https://github.com/UKPLab/sentence-transformers/issues/1318#issuecomment-1084731111
export OMP_NUM_THREADS=1

export NL_SERVER_PORT=${NL_SERVER_PORT:-6060}

# If OUTPUT_DIR is not specified and the deprecated GCS_DATA_PATH is, use that as OUTPUT_DIR.
if [[ $OUTPUT_DIR == "" && $GCS_DATA_PATH != "" ]]; then
    echo "GCS Data Path: $GCS_DATA_PATH"
    echo "GCS_DATA_PATH is deprecated and will be removed in the future. Use OUTPUT_DIR instead."
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
export ADDITIONAL_CATALOG_PATH=$USER_DATA_PATH/datacommons/nl/embeddings/custom_catalog.yaml

if [[ $USE_SQLITE == "true" ]]; then
    export SQLITE_PATH=$OUTPUT_DIR/datacommons/datacommons.db
    echo "SQLITE_PATH=$SQLITE_PATH"
fi

nginx -c /workspace/nginx.conf

MIXER_ARGS=()
if [[ $ENABLE_MODEL == "true" ]]; then
    # Custom embeddings index built at 
    # https://github.com/datacommonsorg/website/blob/40111935bd6e564f8825c7abc1ccd920ea942aef/build/cdc_data/run.sh#L90-L94
    export CUSTOM_EMBEDDINGS_INDEX=${CUSTOM_EMBEDDINGS_INDEX:-"user_all_minilm_mem"}
    MIXER_ARGS+=(
        "--embeddings_server_url=http://localhost:$NL_SERVER_PORT"
        "--resolve_embeddings_indexes=$CUSTOM_EMBEDDINGS_INDEX"
    )
fi

# Start mixer.
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

# Start NL server.
if [[ $ENABLE_MODEL == "true" ]]; then
    if [[ $DEBUG == "true" ]]; then
        echo "Starting NL Server in debug mode."
        python3 nl_app.py $NL_SERVER_PORT &
    else
        echo "Starting NL Server."
        gunicorn --log-level info --preload --timeout 1000 --bind 0.0.0.0:$NL_SERVER_PORT -w 1 nl_app:app &
    fi
fi

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
