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

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

function cleanup {
  deactivate
  exit 1
}

trap cleanup SIGINT

# Ensure uv is installed
if ! command -v uv &> /dev/null; then
  echo -e "${RED}Error: uv could not be found. Please install it and try again.${NC}"
  exit 1
fi

# Ensure protoc v3.21.12 is installed
if [[ $(protoc --version) != *"3.21.12"* ]]; then
  echo -e "${RED}Error: protoc version 3.21.12 is required.${NC}"
  echo -e "${YELLOW}Current version: $(protoc --version)${NC}"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${YELLOW}On Mac, you can install this version with: brew install protobuf@21 && brew link protobuf@21${NC}"
  fi
  exit 1
fi

# Ensure website venv is present and activated
if [ ! -d "server/.venv" ]; then
  echo -e "${YELLOW}Error: server/.venv directory not found. Running './run_test.sh --setup_website'.${NC}"
  ./run_test.sh --setup_website
fi
source server/.venv/bin/activate

# Sync uv dependencies for the datacommons-website-server package
if ! uv sync --project server --active; then
  echo -e "${RED}Error: uv sync failed.${NC}"
  cleanup
fi

PORT=8080
ENABLE_MODEL=false

function help {
cat << EOF

Usage: $(basename "$0") [-e <env>] [-p <port>] [-m] [-d] [-l] [-g]

Options:
  -e <env>   Run with a specified environment (lite, custom, etc.) [Default: local]
  -p <port>  Run on a specified port [Default: 8080]
  -m         Enable language models
  -d         Enable disaster JSON cache
  -l         Use local mixer
  -g         Use Gunicorn

EOF
  exit 1
}

# Leading ':' enables silent error mode. Flags followed by ':' require arguments; others are boolean switches.
while getopts ":e:p:mdlg" OPTION; do
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
  d)
    export ENABLE_DISASTER_JSON=true
    ;;
  l)
    # Use local mixer
    export WEBSITE_MIXER_API_ROOT=http://127.0.0.1:8081
    ;;
  g)
    USE_GUNICORN=true
    ;;
  *)
    help
    ;;
  esac
done

export GOOGLE_CLOUD_PROJECT=datcom-website-dev
export ENABLE_DATAGEMMA=true

# Set flask env
if [[ -z "$FLASK_ENV" || "$FLASK_ENV" == "test" ]]; then
  export FLASK_ENV="local"
  if [[ $ENV_PREFIX == "" ]]; then
    export ENV_PREFIX="DC"
  fi
else
  export ENV_PREFIX="Local"
fi
echo "Starting localhost with FLASK_ENV='$FLASK_ENV' on port='$PORT'"

if [[ $USE_GUNICORN ]]; then
  uv run --project server/ gunicorn --log-level info --preload --timeout 1000 --bind localhost:${PORT} -w 4 web_app:app
else
  if ! protoc -I=./server/config/ --python_out=./server/config ./server/config/subject_page.proto; then
    echo -e "${RED}Error: protoc compilation failed.${NC}"
    cleanup
  fi
  if ! uv run --project server/ python3 web_app.py $PORT; then
    echo -e "${RED}Error: uv run failed.${NC}"
    cleanup
  fi
fi
