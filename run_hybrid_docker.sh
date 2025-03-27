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
#
# See documentation in the help function below.

help() {
cat << EOF
Usage:

./run_local_docker.sh [--env_file|-e <env.list file path>] [--mode|m run ] 
  container|-c service|data [--release|-r latest|stable] [--image|-i <custom image name:tag>] 
  [--schema_update|s] 

./run_local_docker.sh [--env_file|-e <env.list file path>] [--mode|m run ] 
  [container|-c data] [--release|-r latest|stable] --schema_update|s 

./run_local_docker.sh [--env_file|-e <env.list file path>] --mode|m build_run 
  --image <custom image name:tag> [container|-c service]

Options:

--env_file|-e <path to env.list file> 
  Optional: The path and file name of the environment file env.list. 
  Default: custom_dc/env.list
  Use this option to maintain multiple alternate environment files with
  different settings and directories (helpful for testing).
      
--mode|m
  Optional: The different Docker commands to run. 
  Default: run: Runs data or service container.
  Other options are:
  * build_run: Build a custom image and run service container.

--container|-c service|data
  Required in 'run' mode.
  Optional in 'build_and_run' mode; only option is 'service'.
  * service: Only run the service container. Use this to run a local service reading data from Cloud SQL.
  * data: Only run the data container. Use this to run a local data container writing output to Cloud SQL.

--release|r stable|latest
  Optional: run the prebuilt 'stable' image provided by Data Commons team.
  Other options:
  * latest: Run the 'latest' release provided by Data Commons team. 
  Only valid in 'run' mode; ignored in 'build_and_run'.

--image <custom image name:tag>
  Optional in 'run' mode: the name and tag of the previously built custom image to run in the service container.
  Required in 'build_and_run' mode: the name and tag of the custom image to build and run.
  Ignored with 'data' container.
     
--schema_update|-s
  Optional. In the rare case that you get a 'SQL checked failed' error in
  your running service, you can set this to run the data container in 
  schema update mode, which skips embeddings generation and completes much faster.
  Only valid with 'data' container and 'run' mode. Ignored otherwise.

Examples:

./run_hybrid_docker.sh --container service --release latest
  Start the service container, using the prebuilt latest release.

./run_hybrid_docker.sh --mode build_run --image my-datacommons:dev
  Build a custom image and start the service container.

./run_hybrid_docker.sh --container data
  Run the data container.

For more details, see https://docs.datacommons.org/custom_dc/advanced.html
EOF
}

cd $(dirname "$0")

set -e

# Define color codes
RED="\033[1;31m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
NC="\033[0m" # No Color

# Functions for running Docker commands
##############################################

# Build custom image
build() {
  echo -e "${GREEN}Starting Docker build of '$IMAGE'. This will take several minutes..."
  docker build --tag $IMAGE \
  -f build/cdc_services/Dockerfile .
  return 0
}

# Run data container in hybrid mode
run_data() {
  check_app_credentials
  if [ "$RELEASE" == "latest" ]; then
    docker pull gcr.io/datcom-ci/datacommons-data:latest
  fi
  schema_update='""'
  schema_update_text=""
  if [ "$SCHEMA_UPDATE" == true ]; then
    schema_update="-e DATA_UPDATE_MODE=schemaupdate"
    schema_update_text=" in schema update mode"
  fi
  echo -e "${GREEN}Starting Docker data container with '$RELEASE' release${schema_update_text} and writing output to Google Cloud...${NC}\n"
  docker run -it \
  --env-file $ENV_FILE \
  ${schema_update//\"/} \
  -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/creds.json \
  -v $HOME/.config/gcloud/application_default_credentials.json:/gcp/creds.json:ro \
  -v $INPUT_DIR:$INPUT_DIR \
  gcr.io/datcom-ci/datacommons-data:${RELEASE}
}

# Run service container in hybrid mode
run_service() {
  check_app_credentials
  # Custom-built image
  if [ -n "$IMAGE" ]; then
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
  # Data Commons-released images
  else 
    if [ "$RELEASE" == "latest" ]; then
      docker pull gcr.io/datcom-ci/datacommons-services:latest
    fi
    echo -e "${GREEN}Starting Docker services container with '${RELEASE}' release reading data in Google Cloud...${NC}\n"
    docker run -it \
    --env-file $ENV_FILE \
    -p 8080:8080 \
    -e DEBUG=true \
    -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/creds.json \
    -v $HOME/.config/gcloud/application_default_credentials.json:/gcp/creds.json:ro \
    gcr.io/datcom-ci/datacommons-services:${RELEASE}
  fi
}

# Functions for checking GCP credentials
############################################################

# Check application default credentials. Needed for hybrid setups and docker tag/push.
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

# Begin execution 
#######################################################

# Initialize variables for optional settings
ENV_FILE="$PWD/custom_dc/env.list"
MODE="run"
CONTAINER=""
RELEASE="stable"
SCHEMA_UPDATE=false
IMAGE=""

# Parse command-line options
OPTS=$(getopt -o e:m:c:r:i:sh --long env_file:,mode:,container:,release:,image:,schema_update,help -n 'run_local_docker.sh' -- "$@")

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
        echo -e "${RED}Error:${NC} File does not exist.\nPlease specify a valid path and file name." >&2
        exit 1
      fi
      shift 2
      ;;
    -m | --mode)
      if [ "$2" == "run" ] || [ "$2" == "build_run" ]; then
        MODE="$2"
        shift 2  
      else
        echo -e "${RED}Error:${NC} That is not a valid mode. Valid options are:\nrun\nbuild_run\n" >&2
        exit 1
      fi
      ;;
    -c | --container)
      if [ "$2" == "service" ] || [ "$2" == "data" ]; then
        CONTAINER="$2"
        shift 2
      else
        echo -e "${RED}Error:${NC} That is not a valid container option. Valid options are:\nservice\ndata\n" >&2
        exit 1
      fi
      ;;
    -r | --release)
      if [ "$2" == "latest" ] || [ "$2" == "stable" ]; then
        RELEASE="$2"
        shift 2
      else
        echo -e "${RED}Error:${NC} That is not a valid release option. Valid options are:\nstable\nlatest\n" >&2
        exit 1
      fi
      ;;
    -i | --image)
      if [ "$2" == "latest" ] || [ "$2" == "stable" ]; then
        echo -e "${RED}Error:${NC} That is not an allowed custom image name. Did you mean to use the '--release' option?\n" >&2
        exit 1
      else
       IMAGE="$2"
       shift 2
      fi
      ;;
    -s | --schema_update)
      SCHEMA_UPDATE=true
      shift
      ;;
    -h | --help)
      help
      exit 0
      shift
      ;;
    --) 
      shift
      break 
      ;;
    esac
done

# Handle garbage input (getopt doesn't do it)
if [ $# -gt 0 ]; then
  echo -e "${RED}Error: ${NC} Invalid input.\nPlease try again. See '--help' for correct usage.\n" >&2
  exit 1
fi

# Missing required options in input
#====================================================
# Missing container option
if [ -z "$CONTAINER" ]; then
  if [ "$MODE" == "build_run" ]; then
    CONTAINER="service"
  else
  echo -e "${RED}Error:${NC} Missing container option.\nPlease use the '--container' or '-c' option with 'service' or 'data'.\n" >&2
  exit 1
  fi
fi

# Get options from the selected env.list file
source "$ENV_FILE"

# Handle various error conditions
#############################################

if [ "$MODE" == "build_run" ] && [ -z "$IMAGE" ]; then
  echo -e "${RED}Error:${NC} Missing an image name and tag for build.\nPlease use the -'-image' or '-i' option with the name and tag of the custom image you are building.\n" >&2
  exit 1
fi

# Missing variables needed to construct Docker commands
#============================================================
# Missing variables in env.list file
#-------------------------------------------------------------
# Needed for docker run -v option
if [ -z "$INPUT_DIR" ] || [ -z "$OUTPUT_DIR" ]; then
  echo -e "${RED}Error:${NC} Missing input or output data directories.\nPlease set 'INPUT_DIR' and 'OUTPUT_DIR' in your env.list file.\n" >&2
fi

if [ "$CONTAINER" == "service" ]; then
  if [[ "$INPUT_DIR" != *"gs://"* ]] && [[ "$OUTPUT_DIR" != *"gs://"* ]]; then
    echo -e "${RED}Error:${NC} Google Cloud path not specified for input or output data directories.\nPlease set 'INPUT_DIR' and 'OUTPUT_DIR' in your env.list file using a 'gs://' prefix.\n" >&2
    exit 1
  fi
fi

if [ "$CONTAINER" == "data" ]; then
  if [[ "$OUTPUT_DIR" != *"gs://"* ]]; then
    echo -e "${RED}Error:${NC} Google Cloud path not specified for output data directory.\nPlease set 'OUTPUT_DIR' in your env.list file using a 'gs://' prefix.\n" >&2
    exit 1
  fi
fi

# Handle invalid option combinations and reset to valid (others are silently 
# ignored and handled by the case statement)
#--------------------------------------------------------------------
if [ "$SCHEMA_UPDATE" == true ] && [ "$CONTAINER" == "service"];then
  CONTAINER="data"
fi

# Call Docker commands
######################################
case "$MODE" in
  "build_run")
     run_service
    ;;
  "run")
    if [ "$CONTAINER" == "service" ]; then
      run_service
    elif [ "$CONTAINER" == "data" ]; then
      run_data
    fi
    ;;
esac

exit 0