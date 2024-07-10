#!/bin/bash
# Copyright 2023 Google LLC
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

export MIXER_API_KEY=$DC_API_KEY
export TOKENIZERS_PARALLELISM=false

if [[ $USE_SQLITE == "true" ]]; then
    export SQLITE_PATH=/sqlite/datacommons.db
fi

nginx -c /workspace/nginx.conf

echo "GCS Data Path: $GCS_DATA_PATH"
if [[ $GCS_DATA_PATH != "" ]]; then
    export USER_DATA_PATH=$GCS_DATA_PATH
else
    export USER_DATA_PATH=/userdata/
fi
export IS_CUSTOM_DC=true

/go/bin/mixer \
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