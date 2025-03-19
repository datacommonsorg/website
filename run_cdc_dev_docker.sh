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


# Usage: ./run_cdc_dev_docker.sh [--containers container-name] [--run-only]
#
# Options:
#   --containers container-name:
#       Optional argument to specify a single container to build and start.
#       If no container is specified, all containers defined in the docker-compose
#       file will be processed.
#
#   --run-only:
#       Optional: If set, the script will run docker-compose without building the containers.
#       Use if the containers have already been built and you only want to start them.
#
# Example:
#   ./run_cdc_dev_docker.sh
#       This will build and start all containers
#   ./run_cdc_dev_docker.sh --containers "dc-website dc-nl-python dc-website-static dc-mixer"
#       This will build and start the dc-website, dc-nl-python, dc-website-static, and dc-mixer containers
#   ./run_cdc_dev_docker.sh --containers dc-mixer --run-only
#       This will start the 'dc-mixer' container without rebuilding it.

set -e

# Define color codes
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
NC='\033[0m' # No Color

# Holds value of --containers argument
CONTAINER=""
# set to true if --run-only is set
RUN_ONLY=false

# Parse command line arguments
POSITIONAL_ARGS=()
# Function to safely shift positional parameters
safe_shift() {
    if [ $# -gt 0 ]; then
        shift
    else
        echo "PEW PEW"
        echo "$1"
        exit 1
    fi
}
while [[ $# -gt 0 ]]; do
  case $1 in
    -c|--containers)
      CONTAINER="$2"
      shift # past argument
      if [ $# -gt 0 ]; then
          shift
      else
          echo -e "${RED}Error: Must specify container name(s) after --containers flag${NC}"
          exit 1
      fi
      ;;
    -r|--run-only)
      RUN_ONLY=true
      shift # past argument
      ;;
    -*|--*)
      echo "Unknown option $1"
      exit 1
      ;;
    *)
      POSITIONAL_ARGS+=("$1") # save positional arg
      shift # past argument
      ;;
  esac
done
set -- "${POSITIONAL_ARGS[@]}" # restore positional parameters


# Runs Custom Data Commons local development environment
ENV_FILE="./build/cdc/dev/.env"
SAMPLE_ENV_FILE="./build/cdc/dev/.env.sample"

echo -e "${GREEN}Starting Custom Data Commons...${NC}"

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}Error:${NC} Environment file '${YELLOW}$ENV_FILE${NC}' not found."
  echo -e "${GREEN}Please do the following:${NC}"
  echo -e "1. Create '${YELLOW}$ENV_FILE${NC}' by copying '${YELLOW}$SAMPLE_ENV_FILE${NC}'."
  echo -e "2. Fill in all required API keys in '${YELLOW}$ENV_FILE${NC}' with actual values."
  echo -e "3. See ${YELLOW}https://docs.datacommons.org/custom_dc/quickstart.html${NC} for more details."
  exit 1
fi


# Function to check if the Application Default Credentials are valid
check_adc_validity() {
  echo -e "${YELLOW}Checking for valid GCP credentials...${NC}"
  # Attempt to print the access token
  ACCESS_TOKEN=$(gcloud auth application-default print-access-token 2>&1)
  
  # Check if the output contains "ERROR"
  if [[ "$ACCESS_TOKEN" == *"ERROR"* ]]; then
    return 1
  fi

  # Optionally, you can add more checks here for token expiry etc.
  return 0
}

# Authenticates with GCP if necessary
authenticate_to_gcp_if_needed() {
  if ! check_adc_validity; then
    echo -e "${YELLOW}Credentials are invalid or expired. Running 'gcloud auth application-default login'...${NC}"
    gcloud auth application-default login
  else
    echo -e "${GREEN}GCP Application Default Credentials are valid.${NC}"
  fi
}

# Authenticate with Google Cloud if needed
authenticate_to_gcp_if_needed

# Build docker containers
if [ "$RUN_ONLY" == false ]; then
  if [ -z $CONTAINER ]; then
    echo -e "${GREEN}Building all containers...${NC}"
  else
    echo -e "${GREEN}Building ${YELLOW}$CONTAINER${GREEN} container...${NC}"
  fi
  docker-compose -f ./build/cdc/dev/docker-compose.yaml build $CONTAINER
fi


# Run docker containers
if [ -z $CONTAINER ]; then
  echo -e "${GREEN}Running all containers...${NC}"
else
  echo -e "${GREEN}Running ${YELLOW}$CONTAINER${GREEN} container...${NC}"
fi
docker-compose -f ./build/cdc/dev/docker-compose.yaml up $CONTAINER