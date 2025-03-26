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
#   ./run_local_docker.sh [--env_file|-e <env.list file path>] [--mode|m run|build_and_run ] 
#      [container|-c all|service|data] [--release|-r latest|stable] [--image|-i <custom image name:tag>] 
#   ./run_local_docker.sh [--env_file|-e <env.list file path>] --mode|m build|build_and_upload|upload 
#      --image <custom image name:tag> [--package|-p <package name:tag>]
#   ./run_local_docker.sh [--env_file|-e <env.list file path>] [--mode|m run] --schema_update|-s  
#      [container|-c all|data] [--release|r latest|stable] [--image <custom image name:tag>]
#
# If no options are set, the default is '--env_file $PWD/custom_dc/env.list --mode run --container all --release stable'
# 
# Options:
#  --env_file|-e <path to env.list file> 
#    Optional: The path and file name of the environment file env.list. 
#    Default: custom_dc/env.list
#    Use this option to maintain multiple alternate environment files with
#    different settings and directories (helpful for testing).
#      
#  --mode|m
#    Optional: The different Docker commands to run. 
#    Default: run: Runs containers, using a prebuilt release or a custom build.
#    Other options are:
#    * build: Only build a custom service image, don't run any containers.
#    * build_and_run: Build a custom service image and run containers.
#    * build_and_upload: Build a custom service image and upload it to Google Cloud (no containers run). 
#    * upload: Upload a previously built image. 
#    With all these options, you must also specify '--image' with the (source) #   mage name and tag.
#
#  --container|-c all|service|data
#    Optional: The containers to run.
#    Default with 'run' and 'build_and_run' modes: all: Run all containers. Other options are:
#    * service: Only run the service container. You can use this if you have 
#      not made any changes to your data, or if you are running in a hybrid mode,
#      with a local service reading data from Cloud SQL.
#    * data: Only run the data container. Only use this if you are running in a hybrid mode, 
#      with a local data container writing output to Cloud SQL.
#    Invalid with 'build', 'build_and_upload' and 'upload' modes: No containers are run.
#
#  --release|r stable|latest
#    Optional in 'run' and 'build_and_run' mode.
#    Default: stable: run the prebuilt 'stable' image provided by Data Commons team.
#    Other options:
#    * latest: Run the 'latest' release provided by Data Commons team. 
#    If you specify this with an additional '--image' option, it applies 
#    only to the data container. Otherise, it applies to both containers, data and service. 
#    Invalid with 'build', 'build_and_upload' and 'upload' modes: No containers are run.
#
#  --image <custom image name:tag>
#    Optional in 'run' mode: the name and tag of the custom image to run in the service container.
#    Required in all other modes: the name and tag of the custom image to build/run/upload.
#  
#  --package <target package name:tag>
#    Optional: The target image to be created and uploaded to Google Cloud.
#    Default: same as the name and tag provided in the '--image' option.
#     
#  --schema_update|-s
#    Optional. In the rare case that you get a 'SQL checked failed' error in
#    your running service, you can set this to run the data container in 
#    schema update mode, which skips embeddings generation and completes much
#    faster.
#
# Examples:
#   ./run_local_docker.sh
#       Start all containers, using the prebuilt 'stable' image released by
#       Data Commons.
#   ./run_local_docker.sh --container service --image latest
#       Start only the service container, using the prebuilt latest release.
#       Use this if you haven't made any changes to your data but just want
#       to pick up the latest code.
#   ./run_local_docker.sh --image my-datacommons:dev
#        Start all containers, using a custom-built image for the service container.
#   ./run_local_docker.sh --mode build_and_run --image my-datacommons:dev --container service
#       Build a custom image and only start the service. Use this if you haven't
#       made any changes to your data but are developing your custom site.
#   ./run_local_docker.sh --mode build --image my-datacommons:dev
#       Build a custom image only, and don't start any containers. Use this
#       if you are building a custom image that you will upload and test later in Google Cloud.
#   ./run_local_docker.sh --mode build_and_upload --image my-datacommons:dev
#       Build a custom image, create a package with the same name and tag,
#       and upload it to the Cloud Artifact Registry. Does not start any local containers.
#
#   For more details, see https://docs.datacommons.org/custom_dc/

# cd $(dirname "$0")

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
  echo -e "${GREEN}Starting Docker build of '$IMAGE'. This may take up to ten minutes..."
  docker build --tag $IMAGE \
  -f build/cdc_services/Dockerfile .
  return 0
}

upload() {
  check_app_credentials
  # Need Docker credentials for running docker tag to create an Artifact Registry package
  get_docker_credentials
  echo -e "${GREEN}Creating package '$GOOGLE_CLOUD_REGION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/$GOOGLE_CLOUD_PROJECT-artifacts/${PACKAGE}'...${NC}\n"
  docker tag ${IMAGE} ${GOOGLE_CLOUD_REGION}-docker.pkg.dev/${GOOGLE_CLOUD_PROJECT}/${GOOGLE_CLOUD_PROJECT}-artifacts/${PACKAGE}
  # Need principal account credentials to run docker push.
  check_gcloud_credentials
  echo -e "${GREEN}Uploading package to Google Artifact Registry. This will take several minutes...${NC}\n"
  docker push ${GOOGLE_CLOUD_REGION}-docker.pkg.dev/${GOOGLE_CLOUD_PROJECT}/${GOOGLE_CLOUD_PROJECT}-artifacts/${PACKAGE}
}

run_data() {
  if [ "$RELEASE" == "latest" ]; then
    docker pull gcr.io/datcom-ci/datacommons-data:${RELEASE}
  fi
  schema_update='""'
  schema_update_text=""
  if [ "$SCHEMA_UPDATE" == true ]; then
    schema_update="-e DATA_UPDATE_MODE=schemaupdate"
    schema_update_text=" in schema update mode"
  fi
  # Hybrid setup: input dir local, output dir in Cloud
if [[ "$OUTPUT_DIR" == *"gs://"* ]]; then
    check_app_credentials
    echo -e "${GREEN}Starting Docker data container with '$RELEASE' release$schema_update_text and writing output to Google Cloud...${NC}\n"
    docker run -it \
    --env-file $ENV_FILE \
    ${schema_update//\"/} \
    -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/creds.json \
    -v $HOME/.config/gcloud/application_default_credentials.json:/gcp/creds.json:ro \
    -v $INPUT_DIR:$INPUT_DIR \
    gcr.io/datcom-ci/datacommons-data:${RELEASE}
  else
    echo -e "${GREEN}Starting Docker data container with '$RELEASE' release$schema_update_text...${NC}\n"
    docker run -it \
    --env-file $ENV_FILE \
    ${schema_update//\"/} \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    gcr.io/datcom-ci/datacommons-data:${RELEASE}
  fi
}


run_service() {
  if [ -n "$IMAGE" ]; then
    if ["$INPUT_DIR" == *"gs://"* ]; then
      check_app_credentials
      echo -e "${GREEN}Starting Docker services container with custom image '${IMAGE}' reading data in Google Cloud...${NC}\n"
      docker run -it \
      --env-file $ENV_FILE \
      -p 8080:8080 \
      -e DEBUG=true \
      -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/creds.json \
      -v $HOME/.config/gcloud/application_default_credentials.json:/gcp/creds.json:ro \
      -v $PWD/server/templates/custom_dc/$CUSTOM_DIR:/workspace/server/templates/custom_dc/$CUSTOM_DIR \
      -v $PWD/static/custom_dc/$CUSTOM_DIR:/workspace/static/custom_dc/$CUSTOM_DIR \
      $IMAGE
    else
      echo -e "${GREEN}Starting Docker services container with custom image '${IMAGE}'...${NC}\n"
      docker run -it \
      --env-file $ENV_FILE \
      -p 8080:8080 \
      -e DEBUG=true \
      -v $INPUT_DIR:$INPUT_DIR \
      -v $OUTPUT_DIR:$OUTPUT_DIR \
      -v $PWD/server/templates/custom_dc/$CUSTOM_DIR:/workspace/server/templates/custom_dc/$CUSTOM_DIR \
      -v $PWD/static/custom_dc/$CUSTOM_DIR:/workspace/static/custom_dc/$CUSTOM_DIR \
      $IMAGE
    fi
  elif [[ "$INPUT_DIR" == *"gs://"* ]]; then
    check_app_credentials
    if [ "$RELEASE" == "latest" ]; then
      docker pull gcr.io/datcom-ci/datacommons-services:${RELEASE}
    fi
    echo -e "${GREEN}Starting Docker services container with '${RELEASE}' release reading data in Google Cloud...${NC}\n"
    docker run -it \
    --env-file $ENV_FILE \
    -p 8080:8080 \
    -e DEBUG=true \
    -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/creds.json \
    -v $HOME/.config/gcloud/application_default_credentials.json:/gcp/creds.json:ro \
     gcr.io/datcom-ci/datacommons-services:${RELEASE}
  else
    if [ "$RELEASE" == "latest" ]; then
      docker pull gcr.io/datcom-ci/datacommons-services:${RELEASE}
    fi
    echo -e "${GREEN}Starting Docker services container with '${RELEASE}' release...${NC}\n"
    docker run -it \
    --env-file $ENV_FILE \
    -p 8080:8080 \
    -e DEBUG=true \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    gcr.io/datcom-ci/datacommons-services:${RELEASE}
  fi
}

# Functions for checking GCP credentials
############################################################

# This is for checking the application default credentials (in this case the Data 
# Commons containers) to access GCP
check_app_credentials() {
  echo -e "Checking for valid Cloud application default credentials...\n"
  # Attempt to print the access token
  gcloud auth application-default print-access-token > /dev/null
  exit_status=$?
  if [ ${exit_status} -eq 0 ]; then
    echo -e "GCP application default credentials are valid.\n"
    return 0
    # If they're not, the gcloud auth application-default login program will take over
  fi
}

# This is to get credentials to authenticate Docker to GCP 
get_docker_credentials() {
  echo -e "Getting credentials for Cloud Docker package...\n"
  gcloud auth configure-docker ${GOOGLE_CLOUD_REGION}-docker.pkg.dev
  exit_status=$?
  if [ ${exit_status} -eq 0 ]; then
    return 0
  fi
}

# This is for checking the user's/service account's credentials to authorize
# gcloud to access GCP
check_gcloud_credentials() {
  echo -e "Checking for valid gcloud credentials...\n"
  # Attempt to print the identity token 
  gcloud auth print-identity-token > /dev/null
  exit_status=$?
  if [ ${exit_status} -eq 0 ]; then
    echo -e "gcloud credentials are valid.\n"
    return 0
    # If they're not, the gcloud auth login program will take over
  fi
}

# Begin execution 
#######################################################

# Initialize variables for optional settings
ENV_FILE="$PWD/custom_dc/env.list"
MODE="run"
CONTAINER="all"
RELEASE="stable"
SCHEMA_UPDATE=false
IMAGE=""
PACKAGE="$IMAGE"

# Parse command-line options
OPTS=$(getopt -o e:m:c:r:i:sp: --long env_file:,mode:,container:,release:,image:,schema_update,package: -n 'run_local_docker.sh' -- "$@")

if [ $? != 0 ]; then
  echo "Failed to parse options." >&2
  exit 1
fi

eval set -- "$OPTS"

# Process command-line options
# getopt handles invalid options and missing arguments
while true; do
  case "$1" in
    -e | --env_file)
      if [ -f "$2" ]; then
        ENV_FILE="$2"
      else
        echo -e "${RED}Error:${NC} File does not exist."
        echo -e "Please specify a valid path and file name."
        exit 1
      fi
      shift 2
      ;;
    -m | --mode)
      if [ "$2" == "run" ] || [ "$2" == "build" ] || [ "$2" == "build_and_run" ] || [ "$2" == "build_and_upload" ] || [     "$2" == "upload" ]; then
        MODE="$2"
        shift 2  
      else
        echo -e "${RED}Error:${NC} That is not a valid mode. Valid options are:\nrun\nbuild\nbuild_and_run\nbuild_and_upload\nupload\n"
        exit 1
      fi
      ;;
    -c | --container)
      if [ "$2" == "all" ] || [ "$2" == "none" ] || [ "$2" == "service" ] || [ "$2" == "data" ]; then
        CONTAINER="$2"
        shift 2
      else
        echo -e "${RED}Error:${NC} That is not a valid container option. Valid options are:\nall\nnone\nservice\ndata\n"
        exit 1
      fi
      ;;
    -r | --release)
      if [ "$2" == "latest" ] || [ "$2" == "stable" ]; then
        RELEASE="$2"
        shift 2
      else
        echo -e "${RED}Error:${NC} That is not a valid release option. Valid options are:\nstable\nlatest\n"
        exit 1
      fi
      ;;
    -i | --image)
       IMAGE="$2"
       shift 2
       ;;
    -s | --schema_update)
      SCHEMA_UPDATE=true
      shift
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

# Get options from the selected env.list file
source "$ENV_FILE"


# Handle various error conditions
#############################################

# Missing variables needed to construct Docker commands
#============================================================
# Missing variables in env.list file
#-------------------------------------------------------------
# Needed for docker run -v option
if [ -z "$INPUT_DIR" ] || [ -z "$OUTPUT_DIR" ]; then
  echo -e "${RED}Error:${NC} Missing input or output data directories."
  echo -e "Please set 'INPUT_DIR' and 'OUTPUT_DIR' in your env.list file.\n"
  exit 1
fi

# Needed for docker tag and push
if  [[ ( "$MODE" == "upload"  || "$MODE" == "build_upload" ) && ( -z "$GOOGLE_CLOUD_PROJECT" || -z "$GOOGLE_CLOUD_REGION" )]]; then
  echo -e "${RED}Error:${NC} Missing GCP project and region settings."
  echo -e "Please set 'GOOGLE_CLOUD_PROJECT' and/or 'GOOGLE_CLOUD_REGION' in your env.list file.\n"
  exit 1
fi

# Missing options in input
#-------------------------------------------------------------
# Missing custom image for build and upload
if [[ ( "$MODE" == "build" || "$MODE" == "build_and_upload" || "$MODE" == "upload" ) && ( -z "$IMAGE" ) ]]; then
  echo -e "${RED}Error:${NC}Missing an image name and tag for build/upload."
  echo -e "Please use the -'-image' or '-i' option with the name and tag of the custom image you are building or have already built.\n"
  exit 1
fi
if [[ ( -n "$PACKAGE" ) && ( "$MODE" != "upload" || "$MODE" != "build_and_upload" ) ]]; then
  echo -e "${RED}Error:${NC} Invalid options."
  echo -e "Please specify '--mode upload' or '--mode build_and_upload' to create a package.\n"
  exit 1
fi

if [[ ( -z "$PACKAGE" ) && ( "$MODE" == "upload" || "$MODE" == "build_and_upload" ) ]]; then
  echo -e "${YELLOW}Warning:${NC}No '--package' option specified. The target package name and tag will be the same as the source."
  PACKAGE="$IMAGE"
  sleep 5
fi

if [ "$SCHEMA_UPDATE" == true ] && [ "$MODE" != "run" ]; then
  echo -e "${YELLOW}Warning:${NC}Schema update cannot be run in '"$MODE"' mode. Ignoring mode option.\n"
  MODE="run"
  sleep 5
fi

if [ "$SCHEMA_UPDATE" == true ] && [ -n "$IMAGE" ]; then
  echo -e "${YELLOW}Warning:${NC}Schema update cannot be run with custom image. Ignoring image option.\n"
  IMAGE="stable"
  sleep 5
fi

# Reset option values where the defaults don't make sense or user input has 
# has tried to override correct defaults
#-------------------------------------------------------------------------------

# Local service reading data in cloud
if [[ "$INPUT_DIR" == *"gs://"* ]] && [ "$CONTAINER" != "service" ]; then
  echo -e "${YELLOW}Warning:$NC Invalid container option."
  echo -e "Ignoring and running service container only.\n"
  RUN="service"
  sleep 5
fi
# Data container running locally and outputting to cloud
if [[ "$OUTPUT_DIR" == *"gs://"* ]] && [ "$CONTAINER" != "data" ]; then
  echo -e "${YELLOW}Warning:$NC Invalid container option."
  echo -e "Ignoring and running data container only.\n"
  RUN="data"
fi

# Call Docker commands
######################################
case "$MODE" in
  "build")
    build
    exit 0
    ;;
  "build_and_run")
    if [ "$CONTAINER" == "service" ]; then
      build
      run_service
    else
      build
      run_data
      run_service
    fi   
    exit 0
    ;;
  "upload")
    upload
    exit 0
    ;;
  "build_upload")
    build
    upload
    exit 0
    ;;
  "run")
    if [ "$CONTAINER" == "service" ]; then
      run_service
    elif [ "$CONTAINER" == "data" ]; then
      run_data
    else
      run_data
      run_service
    fi
    exit 0;
    ;;
esac