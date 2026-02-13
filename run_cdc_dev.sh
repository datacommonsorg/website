#!/bin/bash
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

# Runs the servers contained in Custom DC for development and testing.
# Note that this is not the exact Custom DC setup used in the services Docker
# image but one that is lighter weight for modifying and running locally.

# Make sure the following are run before running this script:
# ./run_test.sh -b
# ./scripts/update_git_submodules.sh

source scripts/utils.sh
set -e

VERBOSE=false
if [[ "$1" == "--verbose" ]]; then
  VERBOSE=true
fi

exit_with=0

# Kill forked processes, then exit with the status code stored in a variable.
# Called on exit via trap, configured below.
function cleanup() {
  pkill -P $$ || true
  exit $exit_with
}

# On exit, assign status code to a variable and call cleanup.
trap 'exit_with=$?; cleanup' EXIT
# Similar for SIGINT and SIGTERM, but specify that cleanup should exit with
# status code 0 since it's part of normal operation to kill this script
# when done with it.
trap 'exit_with=0; cleanup' SIGINT SIGTERM

if lsof -i :6060 > /dev/null 2>&1; then
  log_error "Port 6060 (for NL server) is already in use. Please stop the process using that port."
  exit 1
fi
if lsof -i :8080 > /dev/null 2>&1; then
  log_error "Port 8080 (for website server) is already in use. Please stop the process using that port."
  exit 1
fi
if lsof -i :8081 > /dev/null 2>&1; then
  log_error "Port 8081 (for envoy) is already in use. Please stop the process using that port."
  exit 1
fi
if lsof -i :12345 > /dev/null 2>&1; then
  log_error "Port 12345 (for mixer) is already in use. Please stop the process using that port."
  exit 1
fi
if lsof -i :8082 > /dev/null 2>&1; then
  log_error "Port 8082 (for mcp) is already in use. Please stop the process using that port."
  exit 1
fi

ENV_FILE=${RUN_CDC_DEV_ENV_FILE:-.run_cdc_dev.env}
echo "Using environment file: $ENV_FILE"
source $ENV_FILE && export $(sed '/^#/d' $ENV_FILE | cut -d= -f1)

# Print commit hashes.
log_notice "website hash: $(git rev-parse --short=7 HEAD)"
log_notice "mixer hash: $(git rev-parse --short=7 HEAD:mixer)"
log_notice "import hash: $(git rev-parse --short=7 HEAD:import)"


if [[ $DC_API_KEY == "" ]]; then
  log_error "DC_API_KEY not specified."
  exit 1
fi

if [[ $MAPS_API_KEY == "" ]]; then
  log_error "MAPS_API_KEY not specified."
  exit 1
fi

echo "DC_API_KEY = $DC_API_KEY"

if [[ $USE_CLOUDSQL == "true" ]]; then
  if [[ $DB_PASS == "" ]]; then
    log_error "DB_PASS must be specified when using Cloud SQL."
    exit 1
  else
    log_notice "DB_PASS = $DB_PASS"
  fi
fi

# Validate api root and key by making an API call.
echo
url="${DC_API_ROOT}/v2/node?key=${DC_API_KEY}&nodes=geoId/06&property=%3C-"
echo "Calling API to validate key: $url"
# Perform the request and capture both output and HTTP status code
response=$(curl --silent --output /dev/null --write-out "%{http_code}" "$url")
status_code=$(echo "$response" | tail -n 1)  # Extract the status code
if [ "$status_code" -ne 200 ]; then
  log_error "API request failed with status code: $status_code"
  exit 1
fi
echo "API request was successful."
echo

# Run mixer and envoy
cd mixer
export MIXER_API_KEY=$DC_API_KEY

echo "Generating Go proto files..."
protoc \
  --proto_path=proto \
  --go_out=paths=source_relative:internal/proto \
  --go-grpc_out=paths=source_relative:internal/proto \
  --go-grpc_opt=require_unimplemented_servers=false \
  --experimental_allow_proto3_optional \
  --include_imports \
  --include_source_info \
  --descriptor_set_out mixer-grpc.pb \
  proto/*.proto proto/**/*.proto

echo "Building mixer..."
go build -o bin/mixer_server cmd/main.go
if [ $? -ne 0 ]; then
  echo "Mixer build failed."
  exit 1
fi
echo "Starting mixer..."
mixer_command="./bin/mixer_server \
  --use_bigquery=false \
  --use_base_bigtable=false \
  --use_custom_bigtable=false \
  --use_branch_bigtable=false \
  --sqlite_path=$SQLITE_PATH \
  --use_sqlite=$USE_SQLITE \
  --use_cloudsql=$USE_CLOUDSQL \
  --cloudsql_instance=$CLOUDSQL_INSTANCE \
  --remote_mixer_domain=$DC_API_ROOT \
  --embeddings_server_url=$EMBEDDINGS_SERVER_URL"
if [[ "$VERBOSE" == "true" ]]; then
  eval "$mixer_command &"
else
  eval "$mixer_command > /dev/null 2>&1 &"
fi
MIXER_PID=$!

envoy_command_base="envoy --config-path esp/envoy-config.yaml"
if [[ "$VERBOSE" == "true" ]]; then
  eval "$envoy_command_base -l info &"
else
  eval "$envoy_command_base -l warning &"
fi
ENVOY_PID=$!

# cd back to website root.
cd ..

# Start NL server.
NL_PID=""
if [[ $ENABLE_MODEL == "true" ]]; then
  echo "Starting NL Server..."
  nl_command="uv run --project nl_server python3 nl_app.py 6060"
  if [[ "$VERBOSE" == "true" ]]; then
    eval "$nl_command &"
  else
    eval "$nl_command > /dev/null 2>&1 &"
  fi
  NL_PID=$!
else
  log_notice "$ENABLE_MODEL is not true, NL server will not be started."
fi

# Start MCP server.
MCP_PID=""
if [[ $ENABLE_MCP == "true" ]]; then
  echo "Starting MCP Server..."
  if ! python3 -c "import datacommons_mcp" &> /dev/null; then
    echo "datacommons-mcp not found, installing..."
    uv pip install datacommons-mcp
  fi
  
  mcp_command="datacommons-mcp serve http --skip-api-key-validation --port 8082"
  
  # Wait for Mixer to be ready in background
  (
    # Ensure this subshell exits if the main script kills it
    trap "exit" INT TERM
    echo "Waiting for Mixer to be ready..."
    # Loop until Mixer /version endpoint returns 200
    wait_time=1
    # total wait time: 1+2+4+8+16+32*8 ~ 5 mins = ~13 retries
    retries_left=13
    while [[ "$(python3 -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8081/version').getcode())" 2>/dev/null || echo 0)" != "200" ]]; do   
      if [ $retries_left -le 0 ]; then
        echo "Mixer failed to start after 5 minutes. MCP server will not start."
        exit 1
      fi
      
      echo "Mixer not ready yet. Retrying in ${wait_time}s... ($retries_left retries left)"
      sleep $wait_time
      wait_time=$((wait_time * 2))
      if [ $wait_time -gt 32 ]; then wait_time=32; fi
      retries_left=$((retries_left - 1))
    done
    echo "Mixer is ready. Starting MCP server."

    eval "exec $mcp_command"
  ) &
  MCP_PID=$!
else
  log_notice "$ENABLE_MCP is not true, MCP server will not be started."
fi

# Start Website server.
echo "Starting Website Server..."
website_command="uv run --project server python3 web_app.py 8080"
if [[ "$VERBOSE" == "true" ]]; then
  eval "$website_command &"
else
  eval "$website_command > /dev/null 2>&1 &"
fi
WEBSITE_PID=$!

# Monitor server processes
while true; do
  if ! ps -p $MIXER_PID > /dev/null; then
    log_error "Mixer server exited early. Run with --verbose to debug."
    exit 1
  fi

  if ! ps -p $ENVOY_PID > /dev/null; then
    log_error "Envoy proxy exited early. Run with --verbose to debug."
    exit 1
  fi

  if ! ps -p $WEBSITE_PID > /dev/null; then
    log_error "Website server exited early. Run with --verbose to debug."
    exit 1
  fi

  if [[ -n "$NL_PID" ]] && ! ps -p $NL_PID > /dev/null; then
    log_error "NL server exited early. Run with --verbose to debug."
    exit 1
  fi

  if [[ -n "$MCP_PID" ]] && ! ps -p $MCP_PID > /dev/null; then
    log_error "MCP server exited early. Run with --verbose to debug."
    exit 1
  fi

  sleep 1 # Check every second
done
