#!/bin/bash
# Copyright 2020 Google LLC
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

python3 -m venv .env
source .env/bin/activate

PORT=8080
ENV=local
ENABLE_MODEL=false
PROTOC_VERSION=3.21.9

function help {
  echo "Usage: $0 -epm"
  echo "-e       Run with a specified environment. Options are: lite custom or any configured env. Default: local"
  echo "-p       Run on a specified port. Default: 8080"
  echo "-m       Enable language models"
  exit 1
}

while getopts ":e:p:m" OPTION; do
  case $OPTION in
    e)
      ENV=$OPTARG
      ;;
    p)
      PORT=$OPTARG
      ;;
    m)
      export ENABLE_MODEL=true
      ;;
    *)
      help
      ;;
  esac
done

if [[ "$(protoc --version)" != "libprotoc ${PROTOC_VERSION}" ]]; then
  echo "ERROR: Please use protoc version: ${PROTOC_VERSION}" 1>&2
  exit 1
fi

export GOOGLE_CLOUD_PROJECT=datcom-website-dev
if [[ $ENV == "lite" ]]; then
  export FLASK_ENV=local-lite
elif [[ $ENV == "custom" ]]; then
  export FLASK_ENV=local-custom
elif [[ $ENV == "iitm" ]]; then
  export FLASK_ENV=local-iitm
elif [[ $ENV == "feedingamerica" ]]; then
  export FLASK_ENV=local-feedingamerica
elif [[ $ENV == "stanford" ]]; then
  export FLASK_ENV=local-stanford
elif [[ ! -z ${ENV+x} ]]; then  # Use any specified env.
  export FLASK_ENV=$ENV
else
  export FLASK_ENV=local
fi
echo "Starting localhost with FLASK_ENV='$FLASK_ENV' on port='$PORT'"

pip3 install -r server/requirements.txt -q
cd server
protoc -I=./config/ --python_out=./config ./config/subject_page.proto
python3 main.py $PORT
cd ..
