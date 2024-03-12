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

function cleanup {
  echo "Cleaning up before exit..."
  deactivate
  exit 1
}
trap cleanup SIGINT


source .env/bin/activate

PORT=8080
ENABLE_MODEL=false

function help {
  echo "Usage: $0 -epmxdl"
  echo "-e       Run with a specified environment. Options are: lite custom or any configured env. Default: local"
  echo "-p       Run on a specified port. Default: 8080"
  echo "-m       Enable language models"
  echo "-x       Enable embedding eval playground"
  echo "-d       [Local dev] Enable disaster JSON cache"
  echo "-l       [Local dev] Use local mixer"
  exit 1
}

while getopts ":e:p:m?d?l?x" OPTION; do
  case $OPTION in
    e)
      export FLASK_ENV=$OPTARG
      ;;
    p)
      export PORT=$OPTARG
      ;;
    m)
      export ENABLE_MODEL=true
      ;;
    x)
      export ENABLE_EVAL_TOOL=true
      ;;
    d)
      export ENABLE_DISASTER_JSON=true
      ;;
    l)
      export USE_LOCAL_MIXER=true
      ;;
    *)
      help
      ;;
  esac
done

export GOOGLE_CLOUD_PROJECT=datcom-website-dev

# Set flask env
if [[ $FLASK_ENV == "" ]]; then
  export FLASK_ENV="local"
  export ENV_PREFIX="DC"
else
  export ENV_PREFIX="Local"
fi
echo "Starting localhost with FLASK_ENV='$FLASK_ENV' on port='$PORT'"

protoc -I=./server/config/ --python_out=./server/config ./server/config/subject_page.proto
python3 web_app.py $PORT
