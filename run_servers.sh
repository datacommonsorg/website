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

# Runs both NL and website servers.
# Assumes that ./run_test.sh -b and ./run_test.sh --setup_python
# have already been run, and that environment variables
# (FLASK_ENV, ENABLE_MODEL, GOOGLE_CLOUD_PROJECT) are already set.
# Server processes are silent unless '--verbose' is specified.

set -e

VERBOSE=false
if [[ "$1" == "--verbose" ]]; then
  VERBOSE=true
fi

exit_with=0

function cleanup() {
  pkill -P $$ || true
  exit $exit_with
}

trap 'exit_with=$?; cleanup' EXIT
trap 'exit_with=0; cleanup' SIGINT SIGTERM

if lsof -i :6060 > /dev/null 2>&1; then
  echo "Port 6060 (for NL server) is already in use. Please stop the process using that port."
  exit 1
fi
if lsof -i :8080 > /dev/null 2>&1; then
  echo "Port 8080 (for website server) is already in use. Please stop the process using that port."
  exit 1
fi

echo "Starting NL Server..."
if [[ $VERBOSE == "true" ]]; then
  python3 nl_app.py 6060 &
else
  python3 nl_app.py 6060 > /dev/null 2>&1 &
fi
NL_PID=$!

echo "Starting Website server..."
if [[ $VERBOSE == "true" ]]; then
  python3 web_app.py 8080 &
else
  python3 web_app.py 8080 > /dev/null 2>&1 &
fi
WEB_PID=$!

while true; do
  if ! ps -p $WEB_PID > /dev/null; then
    echo "Website server exited early. Run with --verbose to debug."
    exit 1
  fi

  if [[ -n "$NL_PID" ]] && ! ps -p $NL_PID > /dev/null; then
    echo "NL server exited early. Run with --verbose to debug."
    exit 1
  fi

  sleep 1
done
