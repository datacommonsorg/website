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
  pip3 install -r server/requirements.txt
  pip3 install torch==2.2.2 --extra-index-url https://download.pytorch.org/whl/cpu
  pip3 install -r nl_server/requirements.txt
  deactivate
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
  python3 -m pytest server/tests/ -s --ignore=server/tests/nodejs_e2e_test.py ${@}
  python3 -m pytest shared/tests/ -s ${@}
  python3 -m pytest nl_server/tests/ -s ${@}

  # Tests within tools/nl/embeddings
  echo "Running tests within tools/nl/embeddings:"
  pip3 install -r tools/nl/embeddings/requirements.txt -q
  python3 -m pytest tools/nl/embeddings/ -s ${@}

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
  source .env/bin/activate
  printf '\n\e[1;35m%-6s\e[m\n\n' "!!! Have you generated the prod client packages? Run './run_test.sh -b' first to do so"
  if [ ! -d server/dist  ]
  then
    echo "no dist folder, please run ./run_test.sh -b to build js first."
    exit 1
  fi
  export FLASK_ENV=webdriver
  export GOOGLE_CLOUD_PROJECT=datcom-website-dev
  python3 -m pytest -n 5 --reruns 2 server/webdriver/tests/ ${@}
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
  python3 -m pytest --reruns 2 server/webdriver/screenshot/ ${@}
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

  python3 -m pytest -vv --reruns 2 server/integration_tests/$1 ${@:2}
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

  # Should update topic cache first as it's used by the following tests.
  python3 -m pytest -vv --reruns 2 server/integration_tests/topic_cache

  # Run integration test against staging mixer to make it stable.
  if [[ $ENV_PREFIX == "" ]]; then
    export ENV_PREFIX=Staging
  fi
  echo "Using ENV_PREFIX=$ENV_PREFIX"
  python3 -m pytest -vv -n 5 --reruns 2 server/integration_tests/ ${@}
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
  echo "--explore       Run explore integration tests"
  echo "--nl            Run nl integration tests"
  echo "--setup_python  Setup python environment"
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
    -p | -w | --explore | --nl | --setup_python | -g | -o | -b | -l | -c | -s | -f | -a)
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
