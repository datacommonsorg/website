#!/bin/bash
# Copyright 2025 Google LLC
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

./run_cdc_dev_docker.sh [--env_file|-e <env.list file path>] 
  [--actions|-a run|build_run|build|build_upload|upload] [--container|-c all|service]
  [--release|-r latest|stable] [--image|-i <custom image name:tag>] 
  [--package|-p <package name:tag>] [--schema-update|-s]

If no options are set, the default is '--env_file $PWD/custom_dc/env.list --actions run --container all --release stable'
All containers are run, using the Data Commons-provided 'stable' image.

Some of these options are mutually exclusive and some are required depending on 
the setting of the '--actions' option. Here is a high-level summary of valid 
combinations:

-a build_run [-c all|service] [-r latest|stable] -i <custom image name:tag>

-a build -i <custom image name:tag>

-a build_upload|upload -i <custom image name:tag> [-p <package name:tag>]

-a run|build_run [-c all] [-r latest|stable] [-i <custom image name:tag>] -s

Note: If you are running in "hybrid" mode, the only valid options are:

./run_cdc_dev_docker.sh [--env_file|-e <env.list file path>] [--actions|-a run|build_run] 
 [--image|-i <custom image name:tag>]

./run_cdc_dev_docker.sh [--env_file|-e <env.list file path>] [--actions|-a run] 
  [--schema-update|-s]

All others will be ignored. The script will infer the correct container based on the 
env.list directory settings and/or the 'build_run' setting. 

Options:

--env_file|-e <path to env.list file> 
  Optional: The path and file name of the environment file env.list. 
  Default: custom_dc/env.list
  Use this option to maintain multiple alternate environment files with different
  settings and directories (helpful for testing).
      
--actions|-a
  Optional: The different Docker commands to run. 
  Default: run: Runs containers, using a prebuilt release or a custom build.
  Other options are:
  * build: Only build a custom service image, don't run any containers.
  * build_run: Build a custom service image and run containers.
  * build_upload: Build a custom service image and upload it to Google Cloud 
    (no containers run). 
  * upload: Upload a previously built image (no containers run). 
  With all these options, you must also specify '--image' with the (source) 
  image name and tag.

-container|-c all|service|data
  Optional: The containers to run.
  Default with 'run' and 'build_run': all: Run all containers. Other options are:
  * service: Only run the service container. You can use this if you have not made 
    any changes to your data, or   you are only running the service container 
    locally (with the data container in the cloud) Exclusive with '--schema-update'.
  * data: Only run the data container. This is only valid if you are running the 
    data container locally (with the service container in the cloud).
    Only valid with 'run' and 'build_run'. Ignored otherwise.
  For "hybrid" setups, the script will infer the correct container to run from the 
  env.list file; this setting will be ignored.

--release|-r stable|latest
  Optional with 'run' and 'build_run'.
  Default: stable: run the prebuilt 'stable' image provided by Data Commons team.
  Other options:
  * latest: Run the 'latest' release provided by Data Commons team. 
    If you specify this with an additional '--image' option, the option applies 
    only to the data container. Otherise, it applies to both containers. 
    Only valid with 'run' and 'build_run'. Ignored otherwise.

--image|-i <custom image name:tag>
  Optional with 'run': the name and tag of the custom image to run in the service 
  container.
  Required for all other actions: the name and tag of the custom image to build/run/upload.
  
--package|-p <target package name:tag>
  Optional: The target image to be created and uploaded to Google Cloud.
  Default: same as the name and tag provided in the '--image' option.
  Only valid with 'build_upload' and 'upload'. Ignored otherwise.
     
--schema_update|-s
  Optional. In the rare case that you get a 'SQL checked failed' error in
  your running service, you can set this to run the data container in 
  schema update mode, which skips embeddings generation and completes much faster.
  Only valid with 'run' and 'build_run' actions and 'all' or 'data' containers. 
  Ignored otherwise.

Examples:

./run_cdc_dev_docker.sh
  Start all containers, using the prebuilt 'stable' release from Data Commons team.

./run_cdc_dev_docker.sh --container service --release latest
  Start only the service container, using the prebuilt latest release.
  Use this if you haven't made any changes to your data but just want to pick 
  up the latest code.

./run_cdc_dev_docker.sh --image my-datacommons:dev
  Start all containers, using a custom-built image for the service container.

./run_cdc_dev_docker.sh --actions build --image my-datacommons:dev
  Build a custom image only, and don't start any containers. Use this if you are 
  building a custom image that you will upload and test later in Google Cloud.

./run_cdc_dev_docker.sh --actions build_run --image my-datacommons:dev --container service
  Build a custom image and only start the service. Use this if you haven't made any 
  changes to your data but are developing your custom site.

./run_cdc_dev_docker.sh --actions build_upload --image my-datacommons:dev
  Build a custom image, create a package with the same name and tag, and upload
  it to the Cloud Artifact Registry. Does not start any local containers.

For more details, see https://docs.datacommons.org/custom_dc/
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
}

# Package and push custom image to GCP
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

# Run data container
run_data() {
  if [ "$RELEASE" == "latest" ]; then
    docker pull gcr.io/datcom-ci/datacommons-data:latest
  fi
  schema_update='""'
  schema_update_text=""
  if [ "$SCHEMA_UPDATE" == true ]; then
    schema_update="-e DATA_UPDATE_MODE=schemaupdate"
    schema_update_text=" in schema update mode"
  fi
  if [ "$data_hybrid" == true ]; then
    check_app_credentials
    echo -e "${GREEN}Starting Docker data container with '$RELEASE' release${schema_update_text} and writing output to Google Cloud...${NC}\n"
    docker run -i \
    --env-file "$ENV_FILE" \
    ${schema_update//\"/} \
    -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/creds.json \
    -v $HOME/.config/gcloud/application_default_credentials.json:/gcp/creds.json:ro \
    -v $INPUT_DIR:$INPUT_DIR \
    gcr.io/datcom-ci/datacommons-data:${RELEASE}
  else
    echo -e "${GREEN}Starting Docker data container with '$RELEASE' release${schema_update_text}...${NC}\n"
    docker run -i \
    --env-file "$ENV_FILE" \
    ${schema_update//\"/} \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    gcr.io/datcom-ci/datacommons-data:${RELEASE}
  fi
}

# Run service container
run_service() {
  if [ "$service_hybrid" == true ]; then
    check_app_credentials
    # Custom-built image
    if [ -n "$IMAGE" ]; then
      echo -e "${GREEN}Starting Docker services container with custom image '${IMAGE}' reading data in Google Cloud...${NC}\n"
      docker run -i \
      --env-file "$ENV_FILE" \
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
      docker run -i \
      --env-file "$ENV_FILE" \
      -p 8080:8080 \
      -e DEBUG=true \
      -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/creds.json \
      -v $HOME/.config/gcloud/application_default_credentials.json:/gcp/creds.json:ro \
      gcr.io/datcom-ci/datacommons-services:${RELEASE}
    fi
  # Regular mode
  else
  # Custom-built image
  if [ -n "$IMAGE" ]; then
    echo -e "${GREEN}Starting Docker services container with custom image '${IMAGE}'...${NC}\n"
    docker run -i \
    --env-file "$ENV_FILE" \
    -p 8080:8080 \
    -e DEBUG=true \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    -v $PWD/server/templates/custom_dc/$CUSTOM_DIR:/workspace/server/templates/custom_dc/$CUSTOM_DIR \
    -v $PWD/static/custom_dc/$CUSTOM_DIR:/workspace/static/custom_dc/$CUSTOM_DIR \
      "$IMAGE"
  # Data Commons-released images
  else 
    if [ "$RELEASE" == "latest" ]; then
     docker pull gcr.io/datcom-ci/datacommons-services:latest
    fi
    echo -e "${GREEN}Starting Docker services container with '${RELEASE}' release...${NC}\n"
    docker run -i \
    --env-file "$ENV_FILE" \
    -p 8080:8080 \
    -e DEBUG=true \
    -v $INPUT_DIR:$INPUT_DIR \
    -v $OUTPUT_DIR:$OUTPUT_DIR \
    gcr.io/datcom-ci/datacommons-services:${RELEASE}
  fi
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

# Get credentials to authenticate Docker to GCP. Needed for docker tag
get_docker_credentials() {
  echo -e "Getting credentials for Cloud Docker package...\n"
  gcloud auth configure-docker ${GOOGLE_CLOUD_REGION}-docker.pkg.dev
  exit_status=$?
  if [ ${exit_status} -eq 0 ]; then
    return 0
  fi
}

# Check the user's/service account's credentials to authorize
# gcloud to access GCP. Needed for docker push.
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
ACTIONS="run"
CONTAINER="all"
RELEASE="stable"
SCHEMA_UPDATE=false
IMAGE=""
PACKAGE=""

# Parse command-line options
OPTS=$(getopt -o e:a:c:r:i:sp:hd --long env_file:,actions:,container:,release:,image:,schema_update,package:,help,debug -n 'run_cdc_dev_docker.sh' -- "$@")

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
        echo -e "${RED}ERROR:${NC} File does not exist.\nPlease specify a valid path and file name." 1>&2
        exit 1
      fi
      shift 2
      ;;
    -a | --actions)
      if [ "$2" == "run" ] || [ "$2" == "build" ] || [ "$2" == "build_run" ] || [ "$2" == "build_upload" ] || [ "$2" == "upload" ]; then
        ACTIONS="$2"
        shift 2  
      else
        echo -e "${RED}ERROR:${NC} That is not a valid action. Valid options are:\nrun\nbuild\nbuild_run\nbuild_upload\nupload\n" 1>&2
        exit 1
      fi
      ;;
    -c | --container)
      if [ "$2" == "all" ] || [ "$2" == "service" ]; then
        CONTAINER="$2"
        shift 2
      else
        echo -e "${RED}ERROR:${NC} That is not a valid container option. Valid options are 'all' or 'service' or 'data'\n" 1>&2
        exit 1
      fi
      ;;
    -r | --release)
      if [ "$2" == "latest" ] || [ "$2" == "stable" ]; then
        RELEASE="$2"
        shift 2
      else
        echo -e "${RED}ERROR:${NC} That is not a valid release option. Valid options are 'stable' or 'latest'\n" 1>&2
        exit 1
      fi
      ;;
    -i | --image)
      if [ "$2" == "latest" ] || [ "$2" == "stable" ]; then
        echo -e "${RED}ERROR:${NC} That is not a valid custom image name. Did you mean to use the '--release' option?\n" 1>&2
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
    -p | --package)
      PACKAGE="$2"
      shift 2
      ;;
    -h | --help)
      help
      exit 0
      shift
      ;;
    -d | --debug) 
      set -x 
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
  echo -e "${RED}ERROR: ${NC} Invalid input.\nPlease try again. See '--help' for correct usage.\n" 1>&2
  exit 1
fi

# Get options from the selected env.list file
source "$ENV_FILE"

# Set variables for hybrid mode
#----------------------------------------------------
# Determine hybrid mode and set a variable to true for use throughout the script
if [[ "$INPUT_DIR" == *"gs://"* ]] && [[ "$OUTPUT_DIR" == *"gs://"* ]]; then
  service_hybrid=true
elif [[ "$INPUT_DIR" != *"gs://"* ]] && [[ "$OUTPUT_DIR" == *"gs://"* ]]; then
  data_hybrid=true
elif [[ "$INPUT_DIR" == *"gs://"* ]] && [[ "$OUTPUT_DIR" != *"gs://"* ]]; then
  echo -e "${RED}ERROR:$NC Invalid data directory settings in env.list file. Please set your OUTPUT_DIR to a Cloud Path or your INPUT_DIR to a local path.\n" 1>&2
  exit 1
fi

# Handle various error conditions
#######################################################

# Missing variables needed to construct Docker commands
#============================================================
# Missing variables in env.list file
#-------------------------------------------------------------
# Needed for docker run -v option
if [ -z "$INPUT_DIR" ] || [ -z "$OUTPUT_DIR" ]; then
  echo -e "${RED}ERROR:${NC} Missing input or output data directories.\nPlease set 'INPUT_DIR' and 'OUTPUT_DIR' in your env.list file.\n" 1>&2
  exit 1
fi

# Needed for docker tag and push
if  [[ ( "$ACTIONS" == *"upload"* ) && ( -z "$GOOGLE_CLOUD_PROJECT" || -z "$GOOGLE_CLOUD_REGION" )]]; then
  echo -e "${RED}ERROR:${NC} Missing GCP project and region settings.\nPlease set 'GOOGLE_CLOUD_PROJECT' and/or 'GOOGLE_CLOUD_REGION' in your env.list file.\n" 1>&2
  exit 1
fi

# Missing variables from input
#-------------------------------------------------------------
# Missing required custom image for build and upload
if [ "$ACTIONS" != "run" ] && [ -z "$IMAGE" ]; then
  echo -e "${RED}ERROR:${NC} Missing an image name and tag for build and/or upload.\nPlease use the -'-image' or '-i' option with the name and tag of the custom image you are building or have already built.\n" 1>&2
  exit 1
fi

# Missing package for upload; not an error, just info
if [[ "$ACTIONS" == *"upload"* ]] && [ -z "$PACKAGE" ]; then
  echo -e "${YELLOW}INFO:${NC} No '--package' option specified."
  echo -e "The target image will use the same name and tag as the source image '$IMAGE'.\n"
  sleep 3
  # Assign image name
  PACKAGE=$IMAGE
fi

# Handle invalid option combinations and reset to valid (most are silently 
# ignored and handled by the case statement)
#--------------------------------------------------------------------
if [ "$data_hybrid" == true ]; then
  ACTIONS="run"
  CONTAINER="data"
elif [ "$SCHEMA_UPDATE" == true ]; then
  CONTAINER="all"
fi  

if [ "$service_hybrid" == true ]; then
  if [ "$ACTIONS" != "run" ] &&  [ "$ACTIONS" != "build_run" ]; then
    echo -e "${RED}ERROR: ${NC}Invalid action for running in "hybrid" service mode.\n Valid options are 'run' or 'build_run'.\n" 1>&2
    exit 1
  fi
  if [ -n "$IMAGE" ]; then
    RELEASE=''
  fi
  CONTAINER="service"
fi

# Call Docker commands
######################################
case "$ACTIONS" in
  "build")
    build
    ;;
  "build_run")
    build
    if [ "$CONTAINER" == "service" ]; then
      run_service
    else
      run_data
      run_service
    fi   
    ;;
  "upload")
    upload
    ;;
  "build_upload")
    build
    upload
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
    ;;
esac

exit 0