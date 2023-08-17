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


USE_SQLITE=$1

if [[ $USE_SQLITE != "true" ]]; then
  USE_SQLITE="false"
  SQLITE_PATH=$2
fi

/go/bin/mixer \
    --use_bigquery=false \
    --use_base_bigtable=false \
    --use_custom_bigtable=false \
    --use_branch_bigtable=false \
    --use_sqlite=$USE_SQLITE \
    --sqlite_path=$SQLITE_PATH \
    --remote_mixer_domain=https://api.datacommons.org &

envoy --config-path /workspace/esp/envoy-config.yaml &

gunicorn --log-level debug --timeout 30 --bind 0.0.0.0:8080 web_app:app

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?