#!/bin/bash

# Copyright 2023 Google LLC
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

function setup_python {
  python3 -m venv .env
  source .env/bin/activate
  echo "installing server/requirements.txt"
  pip3 install -r server/requirements.txt -q
  pip3 install torch==2.2.2 --extra-index-url https://download.pytorch.org/whl/cpu
  echo "installing nl_server/requirements.txt"
  pip3 install -r nl_server/requirements.txt -q
  deactivate
}

function setup_website_python {
  python3 -m venv .env_website
  source .env_website/bin/activate
  echo "installing server/requirements.txt"
  pip3 install -r server/requirements.txt -q
  pip3 install torch==2.2.2 --extra-index-url https://download.pytorch.org/whl/cpu
  deactivate
}

function setup_nl_python {
  python3 -m venv .env_nl
  source .env_nl/bin/activate
  echo "installing nl_server/requirements.txt"
  pip3 install -r nl_server/requirements.txt -q
  deactivate
}

# Start website and NL servers in a subprocess and ensure they are stopped
# if the test script exits before stop_servers is called.
function start_servers() {
  # Kill forked processes, then exit with the status code stored in a variable.
  # Called on exit via trap, configured below.
  function cleanup() {
    pkill -P $$ || true
    if [[ -n "$VIRTUAL_ENV" ]]; then
      deactivate
    fi
    exit $exit_with
  }
  # On exit, assign status code to a variable and call cleanup.
  trap 'exit_with=$?; cleanup' EXIT
  local mode="$1" # Get the mode argument
  if [[ -n "$STARTUP_WAIT_SEC" ]]; then
    startup_wait_sec="$STARTUP_WAIT_SEC"
  elif [[ "$mode" == "cdc" ]]; then
    startup_wait_sec=10
  else
    startup_wait_sec=3
  fi
  if [[ "$mode" == "cdc" ]]; then
    echo "Starting servers using run_cdc_dev.sh..."
    ./run_cdc_dev.sh --verbose &
  else
    echo "Starting servers using run_servers.sh..."
    ./run_servers.sh --verbose &
  fi
  # Store the ID of the subprocess that is running website and NL servers.
  SERVERS_PID=$!
  # Wait a few seconds and make sure the server script subprocess hasn't failed.
  # Tests will time out eventually if health checks for website and NL servers
  # don't pass, but this is quicker if the servers fail to start up immediately.
  sleep "$startup_wait_sec"
  if ! ps -p $SERVERS_PID > /dev/null; then
    echo "Server script not running after $startup_wait_sec seconds."
    exit 1
  fi
}

# Stop the subprocess that is running website and NL servers and remove the
# configuration for cleaning them up on exit.
function stop_servers() {
  if ps -p $SERVERS_PID > /dev/null; then
    kill $SERVERS_PID
  fi
  trap - EXIT
}

# Ensures that the CDC test environment file exists, fetching it from GCP Secret Manager if not.
function ensure_cdc_test_env_file {
  local cdc_env_file_path="$RUN_CDC_DEV_ENV_FILE"
  local secret_name="cdc-test-env-file"
  local project_id="${GOOGLE_CLOUD_PROJECT:-datcom-website-dev}"

  if [[ -z "$cdc_env_file_path" ]]; then
    echo "Error: RUN_CDC_DEV_ENV_FILE is not set. Cannot ensure CDC test env file."
    exit 1
  fi

  if [ ! -f "$cdc_env_file_path" ]; then
    echo "File $cdc_env_file_path does not exist. Attempting to fetch from GCP Secret Manager..."
    echo "Secret: $secret_name, Project: $project_id"

    # Ensure the target directory exists
    mkdir -p "$(dirname "$cdc_env_file_path")"

    # Fetch the secret
    if gcloud secrets versions access latest --secret="$secret_name" --project="$project_id" > "$cdc_env_file_path"; then
      echo "Successfully fetched $cdc_env_file_path from GCP Secret Manager."
    else
      echo "Error: Failed to fetch $secret_name from GCP Secret Manager for project $project_id."
      rm -f "$cdc_env_file_path" # Clean up potentially empty/partial file
      exit 1
    fi
  fi
}

# Run test for client side code.
function run_npm_test {
  cd packages/web-components
  npm install --update
  cd ../client
  npm install --update
  cd ../../static
  npm install --update
  npm run test ${@}
  cd ..
}

# Tests if lint is required on client side code
function run_npm_lint_test {
  cd static
  npm list eslint || npm install eslint
  if ! npm run test-lint; then
    echo "Fix lint errors by running ./run_test.sh -f"
    exit 1
  fi
  cd ..
}

# Fixes lint
function run_lint_fix {
  echo -e "#### Fixing client-side code"
  cd static
  npm list eslint || npm install eslint
  npm run lint
  cd ..

  echo -e "#### Fixing Python code"
  source .env/bin/activate
  pip3 install yapf==0.40.2 -q
  if ! command -v isort &> /dev/null
  then
    pip3 install isort -q
  fi
  yapf -r -i -p --style='{based_on_style: google, indent_width: 2}' server/ nl_server/ shared/ tools/ -e=*pb2.py -e=**/.env/**
  isort server/ nl_server/ shared/ tools/  --skip-glob=*pb2.py  --skip-glob=**/.env/** --profile=google
  deactivate
}

# Build client side code
function run_npm_build () {

  if [[ $1 == true ]]
  then
    echo -e "#### Only installing production dependencies"
    cd packages/web-components/
    npm install --omit=dev
    cd ../client
    npm install --omit=dev
    cd ../../static
    npm install --omit=dev
    npm run-script build
  else
    cd packages/web-components/
    npm install
    cd ../client
    npm install
    cd ../../static
    npm install
    npm run-script dev-build
  fi
  cd ..
}

# Run test and check lint for Python code.
function run_py_test {
  # Run server pytest.
  source .env/bin/activate
  export FLASK_ENV=test
  export TOKENIZERS_PARALLELISM=false
  # Disabled nodejs e2e test to avoid dependency on dev
  python3 -m pytest -n auto server/tests/ -s --ignore=server/tests/nodejs_e2e_test.py ${@}
  python3 -m pytest -n auto shared/tests/ -s ${@}
  python3 -m pytest nl_server/tests/ -s ${@}

  # Tests within tools/nl/embeddings
  echo "Running tests within tools/nl/embeddings:"
  pip3 install -r tools/nl/embeddings/requirements.txt -q
  python3 -m pytest -n auto tools/nl/embeddings/ -s ${@}

  pip3 install yapf==0.40.2 -q
  if ! command -v isort &> /dev/null
  then
    pip3 install isort -q
  fi
  echo -e "#### Checking Python style"
  if ! yapf --recursive --diff --style='{based_on_style: google, indent_width: 2}' -p server/ nl_server/ tools/ -e=*pb2.py -e=**/.env/**; then
    echo "Fix Python lint errors by running ./run_test.sh -f"
    exit 1
  fi

  if ! isort server/ nl_server/ shared/ tools/ -c --skip-glob *pb2.py --skip-glob **/.env/** --profile google; then
    echo "Fix Python import sort orders by running ./run_test.sh -f"
    exit 1
  fi
  deactivate
}

# Run test for webdriver automation test codes.
function run_webdriver_test {
  if [ ! -d server/dist  ]
  then
    echo "no dist folder, please run ./run_test.sh -b to build js first."
    exit 1
  fi
  export FLASK_ENV=webdriver
  export ENABLE_MODEL=true
  export GOOGLE_CLOUD_PROJECT=datcom-website-dev
  if [[ " ${extra_args[@]} " =~ " --flake-finder " ]]; then
    export FLAKE_FINDER=true
  fi
  source .env/bin/activate
  start_servers
  if [[ "$FLAKE_FINDER" == "true" ]]; then
    python3 -m pytest -n auto server/webdriver/tests/ ${@}
  else
    # TODO: Stop using reruns once tests are deflaked.
    python3 -m pytest -n auto --reruns 2 server/webdriver/tests/ ${@}
  fi
  stop_servers
  deactivate
}

# Run test for webdriver automation test codes.
function run_cdc_webdriver_test {
  if [ ! -d server/dist  ]
  then
    echo "no dist folder, please run ./run_test.sh -b to build js first."
    exit 1
  fi
  export RUN_CDC_DEV_ENV_FILE="build/cdc/dev/.env-test"
  ensure_cdc_test_env_file
  export CDC_TEST_BASE_URL="http://localhost:8080"
  if [[ " ${extra_args[@]} " =~ " --flake-finder " ]]; then
    export FLAKE_FINDER=true
  fi
  start_servers "cdc"
  export GOOGLE_CLOUD_PROJECT=datcom-website-dev
  export FLASK_ENV=webdriver
  export ENABLE_MODEL=true
  source .env/bin/activate
  if [[ "$FLAKE_FINDER" == "true" ]]; then
    python3 -m pytest -n auto server/webdriver/cdc_tests/ ${@}
  else
    # TODO: Stop using reruns once tests are deflaked.
    python3 -m pytest -n auto --reruns 2 server/webdriver/cdc_tests/ ${@}
  fi
  stop_servers
  deactivate
}

# Run test for screenshot test codes.
function run_screenshot_test {
  source .env/bin/activate
  printf '\n\e[1;35m%-6s\e[m\n\n' "!!! Have you generated the prod client packages? Run './run_test.sh -b' first to do so"
  if [ ! -d server/dist  ]
  then
    echo "no dist folder, please run ./run_test.sh -b to build js first."
    exit 1
  fi
  export FLASK_ENV=webdriver
  export GOOGLE_CLOUD_PROJECT=datcom-website-dev
  export ENABLE_MODEL=true
  export DC_API_KEY=
  export LLM_API_KEY=
  python3 -m pytest -n auto --reruns 2 server/webdriver/screenshot/ ${@}
  deactivate
}

# Run integration test for NL and explore interface
# The first argument will be the test file under `integration_tests` folder
function run_integration_test {
  source .env/bin/activate
  export ENABLE_MODEL=true
  export FLASK_ENV=integration_test
  export DC_API_KEY=
  export LLM_API_KEY=
  if [[ $ENV_PREFIX == "" ]]; then
    export ENV_PREFIX=Staging
  fi
  echo "Using ENV_PREFIX=$ENV_PREFIX"
  export GOOGLE_CLOUD_PROJECT=datcom-website-staging
  export TEST_MODE=test
  export ENABLE_EVAL_TOOL=false
  start_servers
  python3 -m pytest -vv -n auto --reruns 2 server/integration_tests/$1 ${@:2}
  stop_servers
  deactivate
}

function update_integration_test_golden {
  source .env/bin/activate
  export ENABLE_MODEL=true
  export FLASK_ENV=integration_test
  export GOOGLE_CLOUD_PROJECT=datcom-website-staging
  export TEST_MODE=write
  export DC_API_KEY=
  export LLM_API_KEY=
  export ENABLE_EVAL_TOOL=false

  # Run integration test against staging mixer to make it stable.
  if [[ $ENV_PREFIX == "" ]]; then
    export ENV_PREFIX=Staging
  fi
  echo "Using ENV_PREFIX=$ENV_PREFIX"
  start_servers
  # Should update topic cache first as it's used by the following tests.
  python3 -m pytest -vv -n auto --reruns 2 server/integration_tests/topic_cache
  python3 -m pytest -vv -n auto --reruns 2 server/integration_tests/ ${@}
  stop_servers
  deactivate
}

function run_all_tests {
  run_py_test
  run_npm_build
  run_webdriver_test
  run_npm_lint_test
  run_npm_test
  run_integration_test explore_test.py
  run_integration_test nl_test.py
}

function help {
  echo "Usage: $0 -pwblcsaf"
  echo "-p              Run server python tests"
  echo "-w              Run webdriver tests"
  echo "--cdc           Run Custom DC webdriver tests"
  echo "                Respects the STARTUP_WAIT_SEC environment variable for startup wait time (default 10)."
  echo "--explore       Run explore integration tests"
  echo "--nl            Run nl integration tests"
  echo "--setup_python  Setup python environment"
  echo "--setup_website Setup website python requirements"
  echo "--setup_nl      Setup NL python requirements"
  echo "--setup_all     Setup all python venvs"
  echo "-g              Update integration test golden files"
  echo "-o              Build for production (ignores dev dependencies)"
  echo "-b              Run client install and build"
  echo "-l              Run client lint test"
  echo "-c              Run client tests"
  echo "-a              Run all tests"
  echo "-f              Fix lint"
  exit 1
}

declare -a extra_args=()  # Use an array to handle extra arguments properly
command=""  # Initialize command variable

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    -p | -w | --cdc | --explore | --nl | --setup_python | --setup_website | --setup_nl | --setup_all | -g | -o | -b | -l | -c | -s | -f | -a)
        if [[ -n "$command" ]]; then
            # If a command has already been set, break the loop to process it with the collected extra_args
            break
        fi
        command=$1  # Store the command to call the appropriate function
        shift  # Move to the next command-line argument
        ;;
    *)
        if [[ -n "$command" ]]; then
            # Collect extra args only if a command is already set
            extra_args+=("$1")
        else
            echo "Unknown option: $1"
            help
            exit 1
        fi
        shift
        ;;
  esac
done

# Use "${extra_args[@]}" to correctly pass array elements as separate words
case "$command" in
  -p)
      echo -e "### Running server tests"
      run_py_test "${extra_args[@]}"
      ;;
  -w)
      echo -e "### Running webdriver tests"
      run_webdriver_test "${extra_args[@]}"
      ;;
  --cdc)
      echo -e "### Running Custom DC webdriver tests"
      run_cdc_webdriver_test "${extra_args[@]}"
      ;;
  --explore)
      echo --explore "### Running explore page integration tests"
      run_integration_test explore_test.py "${extra_args[@]}"
      ;;
  --nl)
      echo --nl "### Running nl page integration tests"
      run_integration_test nl_test.py "${extra_args[@]}"
      ;;
  --setup_python)
      echo --setup_python "### Set up python environment"
      setup_python
      ;;
  --setup_website)
      echo --setup_website "### Set up website python requirements"
      setup_website_python
      ;;
  --setup_nl)
      echo --setup_nl "### Set up NL python requirements"
      setup_nl_python
      ;;
  --setup_all)
      echo --setup_all "### Set up all Python venvs"
      setup_python
      setup_website_python
      setup_nl_python
      ;;
  -g)
      echo -e "### Updating integration test goldens"
      update_integration_test_golden "${extra_args[@]}"
      ;;
  -o)
      echo -e "### Production flag enabled"
      PROD=true
      ;;
  -b)
      echo -e "### Build client-side packages"
      run_npm_build "${PROD:-false}"  # Use the value of PROD or default to false
      ;;
  -l)
      echo -e "### Running lint"
      run_npm_lint_test
      ;;
  -c)
      echo -e "### Running client tests"
      run_npm_test "${extra_args[@]}"
      ;;
  -s)
      echo -e "### Running screenshot tests"
      run_screenshot_test "${extra_args[@]}"
      ;;
  -f)
      echo -e "### Fix lint errors"
      run_lint_fix
      ;;
  -a)
      echo -e "### Running all tests"
      run_all_tests
      ;;
esac
