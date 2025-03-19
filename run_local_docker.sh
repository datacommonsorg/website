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


# Usage: ./run_local_docker.sh [--mode <running mode>] ([--release stable|latest] | 
# [--custom_image <image name and tag>]) [--schema_update]
#
# If no options are set, the defaults are --mode run_all --release stable
#
# Options:
#   --mode|-m <running mode>:
#       Optional. Available options are:
#       * run_all (default): Run data and services containers.
#       * run_service: Run only the services container. Only use this if you 
#         haven't made changes to your data.
#       * build_only: Build a custom image, but don't run any containers.
#       * build_and_run_all: Build a custom image and run the data and services
#         containers.
#       * build_and_run_service: Build a custom image and run only the services
#         container. Only use this if you haven't made changes to your data.
#      
#   --release|-r latest | stable (default)
#       Optional. If using the prebuilt image provided by Data commons team, you
#       can choose which release to use. Don't set this if you're using a custom image.
#
#   --custom_image|-c <custom image name and tag>
#       Required if any of the build_* modes are set. Set it to the image name
#       and tag you want to build or have already built.  
#
#   --schema_update|-s
#       Optional. In the rare case that you get a 'SQL checked failed' error in
#       your running service, you can set this to run the data container in 
#       schema update mode, which skips embeddings generation and completes much
#       faster. Only set this with 'run_all' mode.
#
# Examples:
#   ./run_local_docker.sh
#       This starts all containers, using the prebuilt stable images released by
#       Data Commons.
#   ./run_local_docker.sh --mode run_service --release latest
#       This starts only the service container, using the prebuilt latest release.
#       Use this if you haven't made any changes to your data but just want
#       to pick up the latest code.
#   ./run_local_docker.sh --mode build_and_run_all --custom_image my-datacommons:dev
#       This builds a custom image and starts all containers.
#   ./run_local_docker.sh --mode build_only --custom_image my-datacommons:prod
#       This builds a custom image but does not start any containers. Use this
#       if you are building a custom image to upload to Google Cloud.

set -e

# Define color codes
RED="\033[1;31m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
NC="\033[0m" # No Color


# Functions for running Docker commands
build() {
  echo -e "\n${GREEN}Starting Docker build...${NC}\n"
  docker build --tag $CUSTOM_IMAGE \
  -f build/cdc_services/Dockerfile .
}

run_data() {
  if [ $SCHEMA_UPDATE == true ]; then
    echo -e "\n${GREEN}Starting Docker data container in schema update mode...${NC}\n"
    docker run -it \
    --env-file $PWD/custom_dc/env.list \
    -e DATA_UPDATE_MODE=schemaupdate \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    gcr.io/datcom-ci/datacommons-data:$RELEASE
  else
    echo -e "\n${GREEN}Starting Docker data container...${NC}\n"
    docker run -it \
    --env-file $PWD/custom_dc/env.list \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    gcr.io/datcom-ci/datacommons-data:$RELEASE
  fi
}

run_service() {
  if [ -n "$CUSTOM_IMAGE" ]; then
    echo -e "\n${GREEN}Starting Docker services container with custom image ${YELLOW}${CUSTOM_IMAGE}...${NC}\n"
    docker run -it \
    --env-file $PWD/custom_dc/env.list \
    -p 8080:8080 \
    -e DEBUG=true \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    -v $PWD/server/templates/custom_dc/$CUSTOM_DIR/:workspace/server/templates/custom_dc/$CUSTOM_DIR \
    -v $PWD/static/custom_dc/$CUSTOM_DIR/:workspace/static/custom_dc/$CUSTOM_DIR \
    $CUSTOM_IMAGE
  else
    echo -e "\n${GREEN}Starting Docker services container with ${YELLOW}${RELEASE} release...${NC}\n"
    docker run -it \
    --env-file $PWD/custom_dc/env.list \
    -p 8080:8080 \
    -e DEBUG=true \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    gcr.io/datcom-ci/datacommons-services:$RELEASE
  fi
}

# Check that env.list file exists
if [ ! -f "custom_dc/env.list" ]; then
  echo -e "Error: Configuration file ${YELLOW}env.list${NC} not found."
  echo -e "1. Copy custom_dc/env.list.sample and save as custom_dc/env.list."
  echo -e "2. Set all necessary environment variables." 
  echo -e "For details, see comments in the file or refer to https://docs.datacommons.org/custom_dc/quickstart.html#env-vars\n"
  exit 1
fi

# Read required variables from env.list file
INPUT_DIR=`sed -n 's/^INPUT_DIR=\(.*\)/\1/p' < custom_dc/env.list`
OUTPUT_DIR=`sed -n 's/^OUTPUT_DIR=\(.*\)/\1/p' < custom_dc/env.list`
CUSTOM_DIR=`sed -n 's/^FLASK_ENV=\(.*\)/\1/p' < custom_dc/env.list`

# Check that directories are configured
if [ -z "$INPUT_DIR" ] || [ -z "$OUTPUT_DIR" ]; then
  echo -e "Error: Data directories missing in configuration file."
  echo -e "Please set environment variables 'INPUT_DIR' and 'OUTPUT_DIR' in ${YELLOW}env.list${NC}." 
  echo -e "For details, see comments in the file or refer to https://docs.datacommons.org/custom_dc/quickstart.html#env-vars"
  exit 1
fi

# Initialize variables for optional settings
MODE="run_all"
RELEASE="stable"
CUSTOM_IMAGE=""
SCHEMA_UPDATE=false

# Parse command-line options
OPTS=$(getopt -o m:r:c:s --long mode:,release:,custom_image:,schema_update -n 'run_local_docker.sh' -- "$@")

if [ $? != 0 ]; then
  echo "Failed to parse options." >&2
  exit 1
fi

eval set -- "$OPTS"

# Process command-line options
while true; do
  case "$1" in
    -m | --mode)
      if [ "$2" == "run_all" ] || [ "$2" == "build_only" ] || [ "$2" == "build_and_run_service" ] || [ "$2" == "build_and_run_all" ] || [ "$2" == "run_service" ]; then
        MODE="$2"
      else
        echo -e "Error: Invalid mode '$2'. Must be one of the following:\nrun_all (default) \nrun_service\nbuild_only\nbuild_and_run_service\nbuild_and_run_all" >&2
        exit 1
      fi
      shift 2
      ;;
    -r | --release)
      if [ "$2" = "stable" ] || [ "$2" = "latest" ] ; then
       RELEASE="$2"
      else
        echo -e "Error: Invalid release '$2'."
        echo -e "Please specify 'stable' or 'latest'." >&2
        exit 1
      fi
      shift 2
      ;;
    -c | --custom_image)
      if [[ "$2" == *"datcom-ci"* ]]; then
        echo -e "Error: Invalid custom image '$2'". 
        echo -e "Please enter a custom name and tag for your custom build." >&2
        exit 1 
      else
        CUSTOM_IMAGE="$2"
      fi
      shift 2
      ;;
    -s | --schema_update)
      SCHEMA_UPDATE=true
      shift
      ;;
    --) 
      shift
      break 
      ;;
    *)
      echo -e "Error: Unexpected input. Please try again." >&2
      exit 1
      ;;
  esac
done

# Handle invalid option combinations
# No need to handle -c and -r specified together as the former is just ignored if 
# the latter is specified.
if [[( "$MODE" == "build_only" || "$MODE" == "build_and_run_service" || "$MODE" == "build_and_run_all" ) && ( -z "$CUSTOM_IMAGE" )]]; then
  echo -e "Error: Name and tag missing for custom build."
  echo -e "Please set the '-c' or '--custom_image' option with a name and tag."
  exit 1
fi
if [ "$MODE" != "run_all" ] && [ "$SCHEMA_UPDATE" == true ]; then
  echo -e "Error: Schema update invalid in this mode."
  echo -e "Schema update may only be specified in 'run_all' mode."
  exit 1
fi

# Call functions according to selected mode
case $MODE in
  "build_only")
    echo -e "\n${GREEN}Building custom image ${YELLOW}${CUSTOM_IMAGE}...${NC}\n"
    build
    ;;
  "build_and_run_service")
    echo -e "\n${GREEN}Building custom image ${YELLOW}${CUSTOM_IMAGE} and running services container...${NC}\n"
    build
    run_service
    ;;
  "build_and_run_all")
    echo -e "\n${GREEN}Building custom image ${YELLOW}${CUSTOM_IMAGE} and running all containers...${NC}\n" 
    build
    run_data
    run_service
    ;;
  "run_service")
    if [ -n "$CUSTOM_IMAGE" ]; then
      echo -e "\n${GREEN}Running services container with custom image ${YELLOW}${CUSTOM_IMAGE}...${NC}\n"
    else
      echo -e "\n${GREEN}Running services container with ${YELLOW}${RELEASE} release...${NC}\n"
    fi
    run_service
    ;;
  "run_all")
    if [ -n "$CUSTOM_IMAGE" ]; then
      echo -e "\n${GREEN}Running all containers with custom image ${YELLOW}${CUSTOM_IMAGE}...${NC}\n"
    else 
      echo -e "\n${GREEN}Running all ${YELLOW}${RELEASE} containers...${NC}\n"
    fi
    run_data
    run_service
    ;;
esac