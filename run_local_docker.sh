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


# Usage: ./run_local_docker.sh [--build|-b <image name and tag>] [--run|-r data|service|all] [--version|-v stable|latest] | 
#        [--upload|-u <source image name and tag> [<target image and tag>]) [--schema_update|-s] 

# If no options are set, the defaults is --run all
#
# Options:
#   --build|-b 
#       Optional: Build a custom image. If you set this, you must also set the
#          '--image' option with a custom image name and tag. 
#        
#   --run|-r all (default) | service | data | none
#       Optional: If the option is not specified, both data and service containers are run.
#       'service': Only the services container is run. You can use
#          this if you have not made any changes to your data, or if you are running
#          in a hybrid environment, i.e. local service container that accesses data
#          in Google Cloud. In the latter case, be sure that you have configured
#          all GCP-related variables in 'env.list'.
#       'data': Only the data container is run. You should only use this if you are
#          running in a hybrid environment, i.e. local data container writing output
#          to a Google Cloud Storage path, with the service container in Google Cloud.
#       'none': Don't start any containers. You can use this if you are using the 
#          '--build' and/or '--update' options and don't need to run local containers.
#
#    --image|-i stable (default) | latest | <custom image and tag>
#        Optional: The image you want to run. If the option is not specified, the Data
#          Commons 'stable' release is used.
#        'latest': Uses the Data Commons 'latest' release.
#        <custom image and tag>: If you are using '--build' and/or '--upload', this is required.
#          
#    --upload|-u [<target image name and tag>]
#        Optional: Create a package from a custom image and upload it to the Google Cloud
#           Artifact Registry. If you set this, you must also set the
#          '--image' option with a custom image name and tag. 
#        <target image name and tag>Optional. If not set, the source name and tag will
#           be used as the target name for the package.
#           Be sure that you have already set up a registry repository. 
#           See [get link] for details.
#
#   --schema_update|-s
#       Optional. In the rare case that you get a 'SQL checked failed' error in
#         your running service, you can set this to run the data container in 
#         schema update mode, which skips embeddings generation and completes much
#         faster. Only set this with '--run all' or '--run data' options. 
#
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

# Define color codes
RED="\033[1;31m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
NC="\033[0m" # No Color

# Functions for running Docker commands
##############################################

build() {
  echo -e "\n${GREEN}Starting Docker build of '$IMAGE'...${NC}\n"
  docker build --tag $IMAGE \
  -f build/cdc_services/Dockerfile .
}

upload() {
  echo -e "${GREEN}Creating package '$REGION-docker.pkg.dev/$PROJECT_ID/$PROJECT_ID-artifacts/$PACKAGE_NAME'...${NC}\n"
  docker tag $IMAGE $REGION-docker.pkg.dev/$PROJECT_ID/$PROJECT_ID-artifacts/$PACKAGE_NAME
  echo -e "${GREEN}Uploading package to Google Artifact Registry. This will take several minutes...${NC}\n"
  docker push $PACKAGE_NAME
}

run_data() {
  if [ "$SCHEMA_UPDATE" == true ]; then
    echo -e "${GREEN}Starting Docker data container in schema update mode...${NC}\n"
    docker run -it \
    --env-file "$PWD/custom_dc/env.list" \
    -e DATA_UPDATE_MODE=schemaupdate \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    gcr.io/datcom-ci/datacommons-data:${IMAGE}
  else
    echo -e "${GREEN}Starting Docker data container...${NC}\n"
    docker run -it \
    --env-file "$PWD/custom_dc/env.list" \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    gcr.io/datcom-ci/datacommons-data:${IMAGE}
  fi
}

run_service() {
  if [ "$IMAGE" == "stable" ] || [ "$IMAGE" == "stable" ]; then
    echo -e "${GREEN}Starting Docker services container with ${IMAGE} image...${NC}\n"
    docker run -it \
    --env-file "$PWD/custom_dc/env.list" \
    -p 8080:8080 \
    -e DEBUG=true \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    gcr.io/datcom-ci/datacommons-services:${IMAGE}
  else
    echo -e "${GREEN}Starting Docker services container with custom image '${IMAGE}'...${NC}\n"
    docker run -it \
    --env-file "$PWD/custom_dc/env.list" \
    -p 8080:8080 \
    -e DEBUG=true \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    -v $PWD/server/templates/custom_dc/$CUSTOM_DIR:workspace/server/templates/custom_dc/$CUSTOM_DIR \
    -v $PWD/static/custom_dc/$CUSTOM_DIR:workspace/static/custom_dc/$CUSTOM_DIR \
    $IMAGE  
  fi
}

# Functions for checking/getting GCP credentials
# (Needed only for 'update' option)
#########################################################

check_app_credentials() {
  echo -e "Checking for valid GCP credentials...\n"
  # Attempt to print the access token
  gcloud auth application-default print-access-token
  exit_status=$?
  if [ $exit_status -eq 0 ]; then
    echo -e "GCP application default credentials are valid.\n"
    return 0
  else
    exit 1
  fi
}

get_docker_credentials() {
  echo -e "Getting credentials for Docker package...\n"
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

# Read required variables from env.list file
INPUT_DIR=`sed -n 's/^INPUT_DIR=\(.*\)/\1/p' < custom_dc/env.list`
OUTPUT_DIR=`sed -n 's/^OUTPUT_DIR=\(.*\)/\1/p' < custom_dc/env.list`
CUSTOM_DIR=`sed -n 's/^FLASK_ENV=\(.*\)/\1/p' < custom_dc/env.list`
# Only needed for "upload" function
PROJECT_ID=`sed -n 's/^GOOGLE_CLOUD_PROJECT=\(.*\)/\1/p' < custom_dc/env.list`
REGION=`sed -n 's/^GOOGLE_CLOUD_PROJECT=\(.*\)/\1/p' < custom_dc/env.list`

# Initialize variables for optional settings
IMAGE="stable"
SCHEMA_UPDATE=false
PACKAGE_NAME="$IMAGE"
BUILD=false
UPLOAD=false
RUN="all"

# Parse command-line options
OPTS=$(getopt -o br:i:su:: --long build,run:,image:,schema_update,upload:: -n 'run_local_docker.sh' -- "$@")

if [ $? != 0 ]; then
  echo "Failed to parse options." >&2
  exit 1
fi

eval set -- "$OPTS"

# Process command-line options
while true; do
  case "$1" in
    -b | --build)
      BUILD=true
      shift
      ;;
    -r | --run)
      if [ "$2" == "all" ] || [ "$2" == "data" ] || [ "$2" == "none" ] || [ "$2" == "service" ]; then
        RUN="$2"
      else
        echo -e "${RED}Error:${NC} That is not a valid 'run' option. Valid options are:\nall\none\nservice\ndata\n"
        exit 1
      fi
      shift 2
      ;;
    -i | --image)
      IMAGE="$2"
      shift 2
      ;;
    -s | --schema_update)
      SCHEMA_UPDATE=true
      shift
      ;;
    -u | --upload)
      UPLOAD=true
      if [ -n "$OPTARG" ]; then
        PACKAGE_NAME="$OPTARG"
        shift 2
      else
        shift
      fi
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

# Handle various error conditions
#--------------------------------
# Handle missing env.list file 
if [ ! -f "custom_dc/env.list" ]; then
  echo -e "${RED}Error: ${NC}Configuration file 'env.list' not found."
  echo -e "1. Copy 'custom_dc/env.list.sample' and save as 'custom_dc/env.list'."
  echo -e "2. Set all necessary environment variables." 
  echo -e "For details, see comments in the file.\n"
  exit 1
fi
# Handle missing directories
if [[( "$RUN" != "none" ) && ( -z "$INPUT_DIR" || -z "$OUTPUT_DIR" )]]; then
  echo -e "${RED}Error:${NC} Data directories missing in configuration file."
  echo -e "Please set environment variables 'INPUT_DIR' and 'OUTPUT_DIR' in 'env.list'." 
  echo -e "For details, see comments in the file.\n"
  exit 1
fi
# Handle missing name for custom build
if [[ ("$BUILD" == true || "$UPLOAD" == true ) && ( "$IMAGE" == "stable" || "$IMAGE" == "latest" ) ]]; then
  echo -e "${RED}Error:${NC} You have not specified a valid custom image name."
  echo -e "Please set the '--image' or '-i' option with a name and tag for your build.\n" 
  exit 1
fi
# Handle missing GCP region
if [ "$UPLOAD" == true ] && [ -z "$REGION" ]; then
  echo -e "${RED}Error:${NC} Region missing in configuration file."
  echo -e "Please set environment variable 'TBD' in 'env.list'.\n" 
  exit 1
fi

# Call Docker commands
if [ "$BUILD" == true ]; then
  build
fi

if [ "$UPLOAD" == true ]; then
  check_app_credentials
  get_docker_credentials
  upload
# It doesn't make sense to upload and run containers, so we'll make them
# mutually exclusive
  exit 0
elif [ "$RUN" == "data" ]; then
  run_data
elif [ "$RUN" == "service" ]; then
  run_service
elif [ "$RUN" == "none" ]; then
  exit
else
  run_data
  run_service
fi