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

source scripts/utils.sh
set -e

# Note: The .venv environment is being deprecated, this setup function
# is being kept as is to keep --setup_python working for now.
# TODO(juliawu): Remove this function after deprecating .venv and */requirements.txt.
function setup_python {
  assert_uv
  uv venv .venv --allow-existing
  source .venv/bin/activate
  echo "installing server/requirements.txt"
  uv pip install -r server/requirements.txt -q
  echo "installing torch_requirements.txt"
  uv pip install -r torch_requirements.txt -q --index-url https://download.pytorch.org/whl/cpu
  echo "installing nl_server/requirements.txt"
  uv pip install -r nl_server/requirements.txt -q --index-url https://pypi.org/simple
  deactivate
}

function setup_website_python {
  assert_uv
  uv venv server/.venv --allow-existing
  source server/.venv/bin/activate
  echo "installing server requirements to server/.venv"
  uv sync --project server --active
}

function setup_nl_python {
  assert_uv
  uv venv nl_server/.venv --allow-existing
  source nl_server/.venv/bin/activate
  echo "installing nl_server requirements to nl_server/.venv"
  uv sync --project nl_server --active
}

# Assert that website python is set up. If not, set it up.
function assert_website_python {
  if [[ ! -d server/.venv ]]; then
    log_notice "server/.venv does not exist. Setting up website python virtual environment..."
    setup_website_python
  fi
}

# Assert that NL python is set up. If not, set it up.
function assert_nl_python {
  if [[ ! -d nl_server/.venv ]]; then
    log_notice "nl_server/.venv does not exist. Setting up NL python virtual environment..."
    setup_nl_python
  fi
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
    log_error "Server script not running after $startup_wait_sec seconds."
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
    log_error "RUN_CDC_DEV_ENV_FILE is not set. Cannot ensure CDC test env file."
    exit 1
  fi

  if [ ! -f "$cdc_env_file_path" ]; then
    log_notice "File $cdc_env_file_path does not exist. Attempting to fetch from GCP Secret Manager..."
    echo "Secret: $secret_name, Project: $project_id"

    # Ensure the target directory exists
    mkdir -p "$(dirname "$cdc_env_file_path")"

    # Fetch the secret
    if gcloud secrets versions access latest --secret="$secret_name" --project="$project_id" > "$cdc_env_file_path"; then
      log_success "Successfully fetched $cdc_env_file_path from GCP Secret Manager."
    else
      log_error "Failed to fetch $secret_name from GCP Secret Manager for project $project_id."
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
    log_error "Fix lint errors by running ./run_test.sh -f"
    exit 1
  fi
  cd ..
}

# Runs linting tools to automatically fix style issues in the
# codebase. It can target client-side code (npm), Python code (py), or both.
# Accepts one arg via ${extra_args[@]}".
function run_lint_fix {

  # Helper function to fix client-side (npm) code.
  run_npm_fix() {
    echo -e "#### Fixing client-side code"
    # Run commands in a subshell to avoid changing the current directory.
    (
      cd "$(dirname "$0")"
      cd static
      # Install eslint if it's not already installed.
      npm list eslint || npm install eslint

      npm run lint
    )
  }

  # Helper function to fix Python code.
  run_py_fix() {
    echo -e "#### Fixing Python code"
    (
      # Run commands in a subshell to avoid changing the current directory.
      cd "$(dirname "$0")"
      assert_uv
      source .venv/bin/activate
      uv pip install yapf==0.40.2 isort -q -i https://pypi.org/simple
      yapf -r -i -p --style='{based_on_style: google, indent_width: 2}' server/ nl_server/ shared/ tools/ -e=*pb2.py -e=**/.venv/**
      isort server/ nl_server/ shared/ tools/ --skip-glob=*pb2.py --skip-glob=**/.venv/** --profile=google
      deactivate
    )
  }

  # Validate that at most one argument is provided.
  if [[ $# -gt 1 ]]; then
    log_error "Only one lint target can be specified at a time. To run all targets by default, run './run_test -f'"
    return 1
  fi

  # Set the target for lint fixing. Default to 'all' if no argument is given.
  local fix_target=${1:-all}

  # Execute the correct linting function based on the target.
  case "$fix_target" in
    npm)
      run_npm_fix
      ;;
    py)
      run_py_fix
      ;;
    all) # Default case: if no argument or 'all' is provided.
      run_npm_fix
      run_py_fix
      ;;
    *)
      log_error "Unknown lint fix target: $fix_target. Use 'py', 'npm', or 'all'."
      return 1
      ;;
  esac
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
  assert_uv
  # Run server pytest.
  assert_website_python
  source server/.venv/bin/activate
  export FLASK_ENV=test
  export TOKENIZERS_PARALLELISM=false
  # Run website server tests
  # Disabled nodejs e2e test to avoid dependency on dev
  uv run --project server python3 -m pytest -n auto server/tests/ -s --ignore=server/tests/nodejs_e2e_test.py ${@}
  uv run --project server python3 -m pytest -n auto shared/tests/ -s ${@}

  # Run nl server tests
  assert_nl_python
  uv run --project nl_server python3 -m pytest nl_server/tests/ -s ${@}

  # Tests within tools/nl/embeddings
  # TODO: Migrate tools/nl/embeddings to use uv
  echo "Running tests within tools/nl/embeddings:"
  python -m venv tools/nl/embeddings/.venv
  source tools/nl/embeddings/.venv/bin/activate
  pip install -r tools/nl/embeddings/requirements.txt -q
  python -m pytest -n auto tools/nl/embeddings/ -s ${@}
  deactivate

  # Check Python style using server virtual environment
  source server/.venv/bin/activate
  if ! command v yapf &> /dev/null
  then
    uv pip install yapf==0.40.2 -q -i https://pypi.org/simple
  fi
  if ! command -v isort &> /dev/null
  then
    uv pip install isort -q -i https://pypi.org/simple
  fi
  echo -e "#### Checking Python style"
  if ! yapf --recursive --diff --style='{based_on_style: google, indent_width: 2}' -p server/ nl_server/ tools/ -e=*pb2.py -e=**/.venv/**; then
    log_error "Fix Python lint errors by running ./run_test.sh -f"
    exit 1
  fi

  if ! isort server/ nl_server/ shared/ tools/ -c --skip-glob *pb2.py --skip-glob **/.venv/** --profile google; then
    log_error "Fix Python import sort orders by running ./run_test.sh -f"
    exit 1
  fi
  deactivate
}

# Run test for webdriver automation test codes.
function run_webdriver_test {
  # Filter out --no_extract and --no_compress from arguments passed to pytest
  local pytest_args=()
  for arg in "$@"; do
    if [[ "$arg" != "--no_extract" && "$arg" != "--no_compress" ]]; then
      pytest_args+=("$arg")
    fi
  done

  if [ ! -d server/dist  ]
  then
    log_notice "no dist folder, building js..."
    run_npm_build false
  fi
  export FLASK_ENV=webdriver
  export ENABLE_MODEL=true
  export GOOGLE_CLOUD_PROJECT=datcom-website-dev
  export WEBDRIVER_RECORDING_MODE=${WEBDRIVER_RECORDING_MODE:-replay}
  if [[ " ${extra_args[@]} " =~ " --flake-finder " ]]; then
    export FLAKE_FINDER=true
  fi
  assert_website_python
  start_servers
  if [[ "$FLAKE_FINDER" == "true" ]]; then
    uv run --project server python3 -m pytest -n auto server/webdriver/tests/ "${pytest_args[@]}"

  else
    # TODO: Stop using reruns once tests are deflaked.
    uv run --project server python3 -m pytest -n auto --reruns 2 server/webdriver/tests/ "${pytest_args[@]}"
  fi
  stop_servers
  deactivate
}

# Run test for webdriver automation test codes.
function run_cdc_webdriver_test {
  if [ ! -d server/dist  ]
  then
    log_notice "no dist folder, building js..."
    run_npm_build false
  fi
  export RUN_CDC_DEV_ENV_FILE="custom_dc/.env-test"
  ensure_cdc_test_env_file
  export CDC_TEST_BASE_URL="http://localhost:8080"
  export WEBDRIVER_RECORDING_MODE=${WEBDRIVER_RECORDING_MODE:-replay}
  if [[ " ${extra_args[@]} " =~ " --flake-finder " ]]; then
    export FLAKE_FINDER=true
  fi
  export MIXER_LOG_LEVEL=${MIXER_LOG_LEVEL:-WARN}
  start_servers "cdc"

  export GOOGLE_CLOUD_PROJECT=datcom-website-dev
  export FLASK_ENV=webdriver
  export ENABLE_MODEL=true
  local rerun_options=""
  if [[ "$FLAKE_FINDER" == "true" ]]; then
    rerun_options=""
  else
    # TODO: Stop using reruns once tests are deflaked.
    rerun_options="--reruns 2"
  fi

  # Filter out --no_extract and --no_compress from arguments passed to pytest
  local pytest_args=()
  for arg in "$@"; do
    if [[ "$arg" != "--no_extract" && "$arg" != "--no_compress" ]]; then
      pytest_args+=("$arg")
    fi
  done

  assert_website_python
  uv run --project server python3 -m pytest -n auto $rerun_options server/webdriver/cdc_tests/ "${pytest_args[@]}"


  stop_servers
}

# Run integration test for NL and explore interface
# The first argument will be the test file under `integration_tests` folder
function run_integration_test {
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

  start_servers
  assert_website_python
  uv run --project server python3 -m pytest -vv -n auto --reruns 2 server/integration_tests/$1 ${@:2}
  stop_servers
}

function update_integration_test_golden {
  export ENABLE_MODEL=true
  export FLASK_ENV=integration_test
  export GOOGLE_CLOUD_PROJECT=datcom-website-staging
  export TEST_MODE=write
  export DC_API_KEY=
  export LLM_API_KEY=

  # Run integration test against staging mixer to make it stable.
  if [[ $ENV_PREFIX == "" ]]; then
    export ENV_PREFIX=Staging
  fi
  echo "Using ENV_PREFIX=$ENV_PREFIX"
  start_servers
  assert_website_python
  # Should update topic cache first as it's used by the following tests.
  uv run --project server python3 -m pytest -vv -n auto --reruns 2 server/integration_tests/topic_cache
  uv run --project server python3 -m pytest -vv -n auto --reruns 2 server/integration_tests/ ${@}
  stop_servers
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
  echo "--record        Run in record mode (regenerate recordings)"
  echo "--replay        Run in replay mode (default)"
  echo "--live          Run in live mode (no recording)"
  echo "--clean         Delete existing recordings before running (requires --record and full run)"
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
    -p | -w | --cdc | --explore | --nl | --setup_python | --setup_website | --setup_nl | --setup_all | -g | -o | -b | -l | -c | -s | -f | -a | --compress_webdriver_recordings)
        if [[ -n "$command" ]]; then
            # If a command has already been set, break the loop to process it with the collected extra_args
            break
        fi
        command=$1  # Store the command to call the appropriate function
        shift  # Move to the next command-line argument
        ;;
    --record)
        export WEBDRIVER_RECORDING_MODE=record
        shift
        ;;
    --replay)
        export WEBDRIVER_RECORDING_MODE=replay
        shift
        ;;
    --live)
        export WEBDRIVER_RECORDING_MODE=live
        shift
        ;;
    --clean)
        CLEAN_RECORDINGS=true
        shift
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

# Check safety of --clean flag
if [[ "$CLEAN_RECORDINGS" == "true" ]]; then
  if [[ "$WEBDRIVER_RECORDING_MODE" != "record" ]]; then
    echo "Error: --clean can only be used with --record mode."
    exit 1
  fi
  # Check for filters in extra_args
  for arg in "${extra_args[@]}"; do
    if [[ "$arg" == "-k" || "$arg" == "-m" || "$arg" == *"test.py" ]]; then
      echo "Error: --clean cannot be used with test filters or specific test files. It requires a full run to avoid data loss."
      exit 1
    fi
  done
fi

# Helper to manage recordings
function manage_recordings {
  local action=$1
  local recordings_dir="server/tests/test_data/webdriver_recordings"
  local tarball="server/tests/test_data/webdriver_recordings.tar.gz"

  if [[ "$action" == "extract" ]]; then
    if [[ "$CLEAN_RECORDINGS" == "true" ]]; then
      echo "Cleaning recordings directory..."
      rm -rf "$recordings_dir"
      echo "Skipping extraction because --clean was passed."
      return
    fi
    if [[ " ${extra_args[@]} " =~ " --no_extract " ]]; then
      echo "Skipping recording extraction (--no_extract passed)."
      return
    fi
    if [[ -f "$tarball" ]]; then
      echo "Extracting $tarball..."
      # Extract to the parent directory since the tarball contains the folder name
      tar -xzf "$tarball" -C "server/tests/test_data"
    fi
  elif [[ "$action" == "compress" ]]; then
    if [[ " ${extra_args[@]} " =~ " --no_compress " ]]; then
      echo "Skipping recording compression (--no_compress passed)."
      return
    fi
    if [[ -d "$recordings_dir" ]]; then
      echo "Compressing recordings to $tarball..."
      tar -czf "$tarball" -C server/tests/test_data webdriver_recordings
    fi
  fi
}

# Use "${extra_args[@]}" to correctly pass array elements as separate words
case "$command" in
  -p)
      echo -e "### Running server tests"
      run_py_test "${extra_args[@]}"
      ;;
  -w)
      echo -e "### Running webdriver tests"
      manage_recordings "extract"
      run_webdriver_test "${extra_args[@]}"
      if [[ "$WEBDRIVER_RECORDING_MODE" == "record" ]]; then
        manage_recordings "compress"
      fi
      ;;
  --cdc)
      echo -e "### Running Custom DC webdriver tests"
      manage_recordings "extract"
      run_cdc_webdriver_test "${extra_args[@]}"
      if [[ "$WEBDRIVER_RECORDING_MODE" == "record" ]]; then
        manage_recordings "compress"
      fi
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
  --compress_webdriver_recordings)
      echo -e "### Compressing webdriver recordings"
      manage_recordings "compress"
      ;;
  -f)
      echo -e "### Fix lint errors"
      run_lint_fix "${extra_args[@]}"
      ;;
  -a)
      echo -e "### Running all tests"
      run_all_tests
      ;;
esac
