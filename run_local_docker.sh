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

# Usage:
#   ./run_local_docker.sh [--run|-r all|service|none] [--version|-v ]
#   ./run_local_docker.sh [--build|-b <image name>] [--run|-r all|service|none] 
#   ./run_local_docker.sh [--build|-b <image name>] [--upload|-u <source image name>] [--package|-p <target image>]
#   ./run_local_docker.sh [--schema_update|-s] 
#
# If no options are set, the default is '--run all'.
# 
# Options:
#  --build|-b <image name>
#    Optional: Build a custom image.
#    Required: <image name>: Name and tag of the image to build.
#
#  --run|-r all (default) | service |  none
#    Optional: If not specified, both data and service containers are run.
#    'service': Only run the service container. You can use this if you have 
#       not made any changes to your data.
#    'none': Don't start any containers. You can use this if you are using the 
#       '--build' and/or '--update' options and don't need to run local containers.
#       If '--upload' is specified, 'none' is the only valid option and is set 
#       by default.
#
#  --version|-v [stable (default) | latest]
#    Optional: The Data Commons-provided prebuilt image version you want to run.
#      If unspecified, defaults to 'stable'.
#      'latest': Uses the Data Commons 'latest' release.
#
#  --schema_update|-s
#    Optional. In the rare case that you get a 'SQL checked failed' error in
#    your running service, you can set this to run the data container in 
#    schema update mode, which skips embeddings generation and completes much
#    faster.
#          
#  --upload|-u <source image>
#    Optional: Create a package from a custom image and upload it to the Google Cloud
#      Artifact Registry. You must have already set up a Registry repository.
#    <source image>: Required: The name and tag of the custom image to use to
#      build the Docker image. (Can be the same as that used in the --build option.)
#
#   --package|-p <target image>
#     Optional: Provide a name and tag for the package to be uploaded. 
#     If you omit this option, the source name and tag will be used as the target name and tag
#     for the package.

# Examples:
#   ./run_local_docker.sh
#       This starts all containers, using the prebuilt stable images released by
#       Data Commons.
#   ./run_local_docker.sh --run service --version latest
#       This starts only the service container, using the prebuilt latest release.
#       Use this if you haven't made any changes to your data but just want
#       to pick up the latest code.
#   ./run_local_docker.sh --build --image my-datacommons:dev
#       This builds a custom image and starts all containers.
#   ./run_local_docker.sh --build --image my-datacommons:dev --run none
#       This builds a custom image but does not start any containers. Use this
#       if you are building a custom image to upload later to Google Cloud.

cd $(dirname "$0")

set -e
export POSIXLY_CORRECT=true

# Define color codes
RED="\033[1;31m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
NC="\033[0m" # No Color

# Functions for running Docker commands
##############################################

build() {
  echo -e "${GREEN}Starting Docker build of '$IMAGE'. This will take several minutes...${NC}\n"
  docker build --tag $IMAGE \
  -f build/cdc_services/Dockerfile .
}

upload() {
  check_app_credentials
  echo -e "${GREEN}Creating package '$GOOGLE_CLOUD_REGION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/$GOOGLE_CLOUD_PROJECT-artifacts/$PACKAGE'...${NC}\n"
  get_docker_credentials
  docker tag $IMAGE $GOOGLE_CLOUD_REGION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/$GOOGLE_CLOUD_PROJECT-artifacts/${PACKAGE}
  check gcloud credentials
  echo -e "${GREEN}Uploading package to Google Artifact Registry. This will take several minutes...${NC}\n"
  docker push $GOOGLE_CLOUD_REGION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/$GOOGLE_CLOUD_PROJECT-artifacts/$PACKAGE
}

run_data() {
  if [ "$SCHEMA_UPDATE" == true ]; then
    echo -e "${GREEN}Starting Docker data container with '$VERSION' release in schema update mode...${NC}\n"
    docker run -it \
    --env-file "$PWD/custom_dc/env.list" \
    -e DATA_UPDATE_MODE=schemaupdate \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    gcr.io/datcom-ci/datacommons-data:${VERSION}
  else
    echo -e "${GREEN}Starting Docker data container with '$VERSION' release...${NC}\n"
    docker run -it \
    --env-file $PWD/custom_dc/env.list \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    gcr.io/datcom-ci/datacommons-data:${VERSION}
  fi
}

run_service() {
  if [ -n "$IMAGE" ]; then
    echo -e "${GREEN}Starting Docker services container with custom image '${IMAGE}'...${NC}\n"
    docker run -it \
    --env-file "$PWD/custom_dc/env.list" \
    -p 8080:8080 \
    -e DEBUG=true \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    -v $PWD/server/templates/custom_dc/$CUSTOM_DIR:/workspace/server/templates/custom_dc/$CUSTOM_DIR \
    -v $PWD/static/custom_dc/$CUSTOM_DIR:/workspace/static/custom_dc/$CUSTOM_DIR \
    $IMAGE
  else
    echo -e "${GREEN}Starting Docker services container with '${VERSION}' release...${NC}\n"
    docker run -it \
    --env-file "$PWD/custom_dc/env.list" \
    -p 8080:8080 \
    -e DEBUG=true \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    gcr.io/datcom-ci/datacommons-services:${VERSION}
  fi
}

# Functions for checking/getting GCP credentials
# (Currently needed only for 'upload' option)
#########################################################

check_app_credentials() {
  echo -e "Checking for valid Cloud application default credentials...\n"
  # Attempt to print the access token
  gcloud auth application-default print-access-token &> /dev/null
  exit_status=$?
  if [ $exit_status -eq 0 ]; then
    echo -e "GCP application default credentials are valid.\n"
    return 0
  else
    exit 1
  fi
}

get_docker_credentials() {
  echo -e "Getting credentials for Cloud Docker package...\n"
  gcloud auth configure-docker $REGION-docker.pkg.dev
  exit_status=$?
  if [ $exit_status -eq 0 ]; then
    return 0
  else
    exit 1
  fi
}

# Begin execution 
#######################################################

# Read and set required variables from env.list file
if [ -f "$PWD/custom_dc/env.list" ]; then
  source "$PWD/custom_dc/env.list"
else
  echo -e "${RED}Error: ${NC}Configuration file 'env.list' not found."
  echo -e "Do the following: "
  echo -e "1. Copy 'custom_dc/env.list.sample' and save as 'custom_dc/env.list'."
  echo -e "2. Set all necessary environment variables." 
  echo -e "For details, see comments in the file or https://docs.datacommons.org/custom_dc/quickstart.html#env-vars\n"
  exit 1  
fi

# Initialize variables for optional settings
VERSION="stable"
SCHEMA_UPDATE=false
IMAGE=""
PACKAGE=""
BUILD=false
UPLOAD=false
RUN="all"

# Parse command-line options
OPTS=$(getopt -o b:r:v:su:p: --long build:,run:,version:,schema_update,upload:,package: -n 'run_local_docker.sh' -- "$@")

if [ $? != 0 ]; then
  echo "Failed to parse options." >&2
  exit 1
fi

eval set -- "$OPTS"

# Process command-line options
# getopt handles invalid options and missing arguments
while true; do
  case "$1" in
    -b | --build)
      BUILD=true
      IMAGE="$2"
      shift 2
      ;;
    -r | --run)
      if [ "$2" == "all" ] || [ "$2" == "none" ] || [ "$2" == "service" ]; then
        RUN="$2"
        shift 2
      else
        echo -e "${RED}Error:${NC} That is not a valid run option. Valid options are:\nall\none\nservice\n"
        exit 1
      fi
      ;;
    -v | --version)
      if [ "$2" == "stable" ] || [ "$2" == "latest" ]; then
        VERSION="$2"
        shift 2
      else 
        echo -e "${RED}Error:${NC} That is not a valid version option. Valid options are 'stable' or 'latest'. \n"
        exit 1
      fi
      ;;
    -s | --schema_update)
      SCHEMA_UPDATE=true
      shift
      ;;
    -u | --upload)
      UPLOAD=true
      IMAGE="$2"
      shift 2
      ;;
    -p | --package)
      PACKAGE="$2"
      shift 2
      ;;
    --) 
      shift
      break 
      ;;
    esac
done

# Handle various error conditions
#--------------------------------
# Handle missing directories
if [[( "$RUN" != "none" ) && ( -z "$INPUT_DIR" || -z "$OUTPUT_DIR" )]]; then
  echo -e "${RED}Error:${NC} Data directories missing in configuration file."
  echo -e "Please set environment variables 'INPUT_DIR' and 'OUTPUT_DIR' in 'env.list'." 
  echo -e "For details, see comments in the file or https://docs.datacommons.org/custom_dc/quickstart.html#env-vars\n"
  exit 1
fi

# Handle missing GCP variables
if [ "$UPLOAD" == true ]; then
  if [ -z "$GOOGLE_CLOUD_PROJECT" ]; then
    echo -e "${RED}Error:${NC} Google Cloud project ID missing in configuration file."
    echo -e "Please set environment variable 'GOOGLE_CLOUD_PROJECT' in 'env.list'.\n" 
    exit 1
  fi
  if [ -z "$GOOGLE_CLOUD_REGION" ]; then
  echo -e "${RED}Error:${NC} Google Cloud region missing in configuration file."
  echo -e "Please set environment variable 'GOOGLE_CLOUD_REGION' in 'env.list'.\n" 
  exit 1
  fi
fi

# Call Docker commands
#------------------------------

if [ "$BUILD" == true ]; then
  build
fi

if [ "$UPLOAD" == true ]; then
  if [ -z "$PACKAGE"]; then
    PACKAGE="$IMAGE"
  fi
  RUN="none"
  upload
fi

# All the run options
if [ "$RUN" == "none" ]; then
  exit 0;
elif [ "$RUN" == "data" ]; then
  run_data
  exit 0
elif [ "$RUN" == "service" ]; then
  run_service
  exit 0
elif [ "$RUN" == "all" ]; then
  run_data
  run_service
  exit 0
fi