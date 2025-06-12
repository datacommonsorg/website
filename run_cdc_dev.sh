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
# ./run_test.sh --setup_all
# ./scripts/update_git_submodules.sh

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
  if [[ -n "$VIRTUAL_ENV" ]]; then
    deactivate
  fi
  exit $exit_with
}

# On exit, assign status code to a variable and call cleanup.
trap 'exit_with=$?; cleanup' EXIT
# Similar for SIGINT and SIGTERM, but specify that cleanup should exit with
# status code 0 since it's part of normal operation to kill this script
# when done with it.
trap 'exit_with=0; cleanup' SIGINT SIGTERM

if lsof -i :6060 > /dev/null 2>&1; then
  echo "Port 6060 (for NL server) is already in use. Please stop the process using that port."
  exit 1
fi
if lsof -i :8080 > /dev/null 2>&1; then
  echo "Port 8080 (for website server) is already in use. Please stop the process using that port."
  exit 1
fi
if lsof -i :8081 > /dev/null 2>&1; then
  echo "Port 8081 (for envoy) is already in use. Please stop the process using that port."
  exit 1
fi
if lsof -i :12345 > /dev/null 2>&1; then
  echo "Port 12345 (for mixer) is already in use. Please stop the process using that port."
  exit 1
fi

# If .env_website or .env_nl folder doesn't exist, print an error and exit
if [ ! -d ".env_website" ]; then
  echo "Error: .env_website not found. Please run ./run_test.sh --setup_website first."
  exit 1
fi
if [ ! -d ".env_nl" ]; then
  echo "Error: .env_nl not found. Please run ./run_test.sh --setup_nl first."
  exit 1
fi

ENV_FILE=${RUN_CDC_DEV_ENV_FILE:-.run_cdc_dev.env}
echo "Using environment file: $ENV_FILE"
source $ENV_FILE && export $(sed '/^#/d' $ENV_FILE | cut -d= -f1)

# Print commit hashes.
echo -e "\033[0;32m" # Set different color.
echo "website hash: $(git rev-parse --short=7 HEAD)"
echo "mixer hash: $(git rev-parse --short=7 HEAD:mixer)"
echo "import hash: $(git rev-parse --short=7 HEAD:import)"
echo -e "\033[0m" # Reset color.


if [[ $DC_API_KEY == "" ]]; then
  echo "DC_API_KEY not specified."
  exit 1
fi

if [[ $MAPS_API_KEY == "" ]]; then
  echo "MAPS_API_KEY not specified."
  exit 1
fi

echo "DC_API_KEY = $DC_API_KEY"

if [[ $USE_CLOUDSQL == "true" ]]; then
  if [[ $DB_PASS == "" ]]; then
    echo "DB_PASS must be specified when using Cloud SQL."
    exit 1
  else
    echo "DB_PASS = $DB_PASS"
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
  echo "API request failed with status code: $status_code"
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
  --remote_mixer_domain=$DC_API_ROOT"
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
  source .env_nl/bin/activate
  echo "Starting NL Server..."
  nl_command="python3 nl_app.py 6060"
  if [[ "$VERBOSE" == "true" ]]; then
    eval "$nl_command &"
  else
    eval "$nl_command > /dev/null 2>&1 &"
  fi
  NL_PID=$!
  deactivate
else
  echo "$ENABLE_MODEL is not true, NL server will not be started."
fi

source .env_website/bin/activate
echo "Starting Website Server..."
website_command="python3 web_app.py 8080"
if [[ "$VERBOSE" == "true" ]]; then
  eval "$website_command &"
else
  eval "$website_command > /dev/null 2>&1 &"
fi
WEBSITE_PID=$!

deactivate

# Monitor server processes
while true; do
  if ! ps -p $MIXER_PID > /dev/null; then
    echo "Mixer server exited early. Run with --verbose to debug."
    exit 1
  fi

  if ! ps -p $ENVOY_PID > /dev/null; then
    echo "Envoy proxy exited early. Run with --verbose to debug."
    exit 1
  fi

  if ! ps -p $WEBSITE_PID > /dev/null; then
    echo "Website server exited early. Run with --verbose to debug."
    exit 1
  fi

  if [[ -n "$NL_PID" ]] && ! ps -p $NL_PID > /dev/null; then
    echo "NL server exited early. Run with --verbose to debug."
    exit 1
  fi

  sleep 1 # Check every second
done
