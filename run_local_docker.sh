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
#   ./run_local_docker.sh [--env_file|-e <env.list file path>] [--run|-r all|service|none] 
#      [--version|-v stable|latest]
#   ./run_local_docker.sh [--env_file|-e <env.list file path>] [--build|-b <image name>] 
#      [--run|-r all|service|none] 
#   ./run_local_docker.sh [--env_file|-e <env.list file path>] [--build|-b <image name>] 
#      [--upload|-u <source image name>] 
#      [--package|-p <target image>] [--run none ]
#   ./run_local_docker.sh [--env_file|-e <env.list file path>] [--schema_update|-s] 
#
#   If no options are set, the default is '--run all --version stable 
#      --env_file $PWD/custom_dc/env.list'.
# 
# Options:
#  --env_file|-e <path to env.list file> 
#    Optional: If not specified, defaults to '$PWD/custom_dc/env.list'. The path
#    and file name of the environment file env.list. Use this option to maintain
#    multiple environment files with different settings (helpful for testing).
#
#  --build|-b <custom image name and tag>
#    Optional: Build a custom image.
#    If you set this, '--run service' is automatically applied. If you set it with
#    the '--upload' option, '--run none' is automatically applied. 
#    If you use this initially with '--run none' you can later 
#    use the '--image' option to specify this build.
#
#  --run|-r all|service|data|none
#    Optional: If not specified, defaults to 'all': both data and service 
#    containers are run.
#    'none': Don't start any containers. You can use this if you are using the 
#       '--build' and/or '--update' options and don't need to run local containers.
#       If '--upload' is specified, 'none' is the only valid option and is set 
#       by default.
#    'service': Only run the service container. You can use this if you have 
#       not made any changes to your data, or if you are doing local development
#       with data in Google Cloud. In the latter case, you must set all GCP variables in 'env/list'.
#       See more information in https://docs.datacommons.org/custom_dc/advanced.html#run-local
#    'data': Only run the data container. You can use this if you are 
#       storing your input data locally and writing output to Google Cloud.
#       with data in the cloud. In the latter case, you must set all GCP variables in 'env/list'.
#       See more information in https://docs.datacommons.org/custom_dc/advanced.html#local-services
#
#  --image|-i stable|latest|<custom image and tag>
#    Optional: The image you want to run. If not specified, defaults to 'stable',
#      the Data Commons prebuilt 'stable' release.
#    'latest': Use the Data Commons 'latest' release.
#     <custom image and tag>:   The name and tag of a custom image you have previously built.
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
#   ./run_local_docker.sh --build my-datacommons:dev [--run service]
#       This builds a custom image and starts the service. Use this if you haven't
#       made any changes to your data but are developing your custom site.
#   ./run_local_docker.sh --build --image my-datacommons:dev -[-run none]
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
    echo -e "${GREEN}Starting Docker data container with '$IMAGE' release in schema update mode...${NC}\n"
    docker run -it \
    --env-file $ENV_FILE \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    gcr.io/datcom-ci/datacommons-data:${IMAGE}
  elif [[ "$OUTPUT_DIR" == *"gs://"*  ]]; then
   echo -e "${GREEN}Starting Docker data container with '$IMAGE' release and output to Google Cloud...${NC}\n"
   check_app_credentials
   docker run -it \
   --env-file $ENV_FILE \
   -v $INPUT_DIR:$INPUT_DIR \
   -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/creds.json \
   -v $HOME/.config/gcloud/application_default_credentials.json:/gcp/creds.json:ro \
   gcr.io/datcom-ci/datacommons-data:${IMAGE}
  else
    echo -e "${GREEN}Starting Docker data container with '$IMAGE' release...${NC}\n"
    docker run -it \
    --env-file $ENV_FILE \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    gcr.io/datcom-ci/datacommons-data:${IMAGE}
  fi
}

run_service() {
  if [ -n "$IMAGE" ]; then
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
  # Data in cloud scenario; assume it's a custom build
  elif [[ "$INPUT_DIR" == "*"gs://"*" && "$OUTPUT_DIR" == *"gs://"*  ]]; then
    echo -e "${GREEN}Starting Docker services container with custom image '${IMAGE}'...${NC}\n"
    check_app_credentials
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
    echo -e "${GREEN}Starting Docker services container with '${IMAGE}' release...${NC}\n"
    docker run -it \
    --env-file $ENV_FILE \
    -p 8080:8080 \
    -e DEBUG=true \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    gcr.io/datcom-ci/datacommons-services:${IMAGE}
  fi
}

# Functions for checking/getting GCP credentials
# (Currently needed only for 'upload' option)
#########################################################

check_app_credentials() {
  echo -e "Checking for valid Cloud application default credentials...\n"
  # Attempt to print the access token
  gcloud auth application-default print-access-token > /dev/null
  exit_status=$?
  if [ ${exit_status} -eq 0 ]; then
    echo -e "GCP application default credentials are valid.\n"
    return 0
  fi
  # Cannot call the login routine on behalf of user. If creds are not valid, the
  # gcloud auth will print out login info and exit.
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

# Initialize variables for optional settings
ENV_FILE="$PWD/custom_dc/env.list"
SCHEMA_UPDATE=false
IMAGE="stable"
PACKAGE=""
BUILD=false
UPLOAD=false
RUN="all"

# Parse command-line options
OPTS=$(getopt -o e:b:r:i:su:p: --long env_file:,build:,run:,image:,schema_update,upload:,package: -n 'run_local_docker.sh' -- "$@")

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
    -b | --build)
      BUILD=true
      IMAGE="$2"
      shift 2
      ;;
    -r | --run)
      if [ "$2" == "all" ] || [ "$2" == "none" ] || [ "$2" == "service" ] || [ "$2" == "data" ]; then
        RUN="$2"
        shift 2
      else
        echo -e "${RED}Error:${NC} That is not a valid run option. Valid options are:\nall\none\nservice\datan"
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

# Get options from the selected env.list file
source "$ENV_FILE"

# Do some basic error handling
# Don't continue if options are missing or invalid in env.list. Eventually
# stuff won't run but the error messages may not be clear.

if [ -z "$INPUT_DIR" ] || [ -z "$OUTPUT_DIR" ]; then
  echo -e "${RED}Error:${NC} Missing input or output data directories."
  echo -e "Please set 'INPUT_DIR' and 'OUTPUT_DIR' in your env.list file.\n"
  exit 1
fi

if ([ "$UPLOAD" == true ]) && ([[ -z "$GOOGLE_CLOUD_PROJECT" || -z "$GOOGLE_CLOUD_REGION" ]]); then
    echo -e "${RED}Error:${NC} Missing GCP project and region settings."
  echo -e "Please set 'GOOGLE_CLOUD_PROJECT' and/or 'GOOGLE_CLOUD_REGION' in your env.list file.\n"
  exit 1
fi

# Reset run options if --build and/or --upload are set
# It doesn't make sense to run both containers in these contexts
#----------------------------------------------------------------
if [ "$BUILD" == true ] && [ "$UPLOAD" == false ]; then
  RUN="service"
elif [ "$UPLOAD" == true ]; then
  RUN="none"
# While we're here, check for a package name, and set it to the same as the
# build name if not specified
  if [ -z "$PACKAGE"]; then
    PACKAGE="$IMAGE"
  fi
fi

# Call Docker commands
#------------------------------

if [ "$BUILD" == true ]; then
  build
fi

if [ "$UPLOAD" == true ]; then
  upload
  exit 0
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