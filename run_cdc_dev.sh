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

set -e

# Runs an approximate custom dc setup for development.
# Note that this is not the exact custom dc setup but one that can be easier to develop against vs doing it in a docker container.

# Make sure the following are run before running this script:
# ./run_npm.sh
# ./scripts/update_git_submodules.sh
# ./run_test.sh --setup_python
# pip3 install -r import/simple/requirements.txt

# Kill forked processes on exit.
trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT

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

echo "Starting mixer..."
go run cmd/main.go \
    --use_bigquery=false \
    --use_base_bigtable=false \
    --use_custom_bigtable=false \
    --use_branch_bigtable=false \
    --sqlite_path=$SQLITE_PATH \
    --use_sqlite=$USE_SQLITE \
    --use_cloudsql=$USE_CLOUDSQL \
    --cloudsql_instance=$CLOUDSQL_INSTANCE \
    --remote_mixer_domain=$DC_API_ROOT &

echo "Starting envoy..."
envoy -l warning --config-path esp/envoy-config.yaml &

# cd back to website root.
cd ..

# Activate python env.
source .env/bin/activate

# Start website server
echo "Starting Website Server..."
python3 web_app.py 8080 &

# Start NL server.
if [[ $ENABLE_MODEL == "true" ]]; then
  echo "Starting NL Server..."
  python3 nl_app.py 6060 &
else
  echo "$ENABLE_MODEL is not true, NL server will not be started."
fi

# Wait for any process to exit.
wait

# Exit with status of process that exited first.
exit $?