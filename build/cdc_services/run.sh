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

/workspace/bin/mixer \
    --use_bigquery=false \
    --use_base_bigtable=false \
    --use_custom_bigtable=false \
    --use_branch_bigtable=false \
    --sqlite_path=$SQLITE_PATH \
    --use_sqlite=$USE_SQLITE \
    --use_cloudsql=$USE_CLOUDSQL \
    --cloudsql_instance=$CLOUDSQL_INSTANCE \
    --remote_mixer_domain=$DC_API_ROOT &

envoy -l warning --config-path /workspace/esp/envoy-config.yaml &

if [[ $DEBUG == "true" ]] then
    if [[ $ENABLE_MODEL == "true" ]] then
        echo "Starting NL Server in debug mode."
        python3 nl_app.py 6060 &
    fi
    echo "Starting Website Server in debug mode."
    python3 web_app.py 7070 &
else
    if [[ $ENABLE_MODEL == "true" ]] then
        echo "Starting NL Server."
        gunicorn --log-level info --preload --timeout 1000 --bind 0.0.0.0:6060 -w 1 nl_app:app &
    fi
    echo "Starting Website Server."
    gunicorn --log-level info --preload --timeout 1000 --bind 0.0.0.0:7070 -w 4 web_app:app &
fi

# Wait for any process to exit
wait

# Exit with status of process that exited first
exit $?