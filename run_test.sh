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
}

function setup_python_nl {
  python3 -m venv .env
  source .env/bin/activate
  python3 -m pip install --upgrade pip setuptools light-the-torch
  ltt install torch --cpuonly
  pip3 install -r nl_server/requirements.txt
}

# Run test for client side code.
function run_npm_test {
  cd static
  npm run test
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
  python3 -m venv .env
  source .env/bin/activate
  pip3 install yapf==0.33.0 -q
  if ! command -v isort &> /dev/null
  then
    pip3 install isort -q
  fi
  yapf -r -i -p --style='{based_on_style: google, indent_width: 2}' server/ nl_server/ shared/ tools/ -e=*pb2.py
  isort server/ nl_server/ shared/ tools/  --skip-glob *pb2.py  --profile google
  deactivate
}

# Build client side code
function run_npm_build () {
  cd static
  if [[ $1 == true ]]
  then
    echo -e "#### Only installing production dependencies"
    npm install --omit=dev
    npm run-script build
  else
    npm install
    npm run-script dev-build
  fi
  cd ..
}

# Run test and check lint for Python code.
function run_py_test {
  setup_python
  setup_python_nl
  export FLASK_ENV=test
  python3 -m pytest server/tests/ -s --ignore=sustainability

  # TODO(beets): add tests for other private dc instances
  # export FLASK_ENV=test-sustainability
  # python3 -m pytest tests/sustainability/**.py
  python3 -m pytest shared/tests/ -s
  python3 -m pytest nl_server/tests/ -s

  pip3 install yapf==0.33.0 -q
  if ! command -v isort &> /dev/null
  then
    pip3 install isort -q
  fi
  echo -e "#### Checking Python style"
  if ! yapf --recursive --diff --style='{based_on_style: google, indent_width: 2}' -p server/ nl_server/ tools/ -e=*pb2.py; then
    echo "Fix Python lint errors by running ./run_test.sh -f"
    exit 1
  fi

  if ! isort server/ nl_server/ tools/ -c --skip-glob *pb2.py --profile google; then
    echo "Fix Python import sort orders by running ./run_test.sh -f"
    exit 1
  fi
}

# Run test for webdriver automation test codes.
function run_webdriver_test {
  printf '\n\e[1;35m%-6s\e[m\n\n' "!!! Have you generated the prod client packages? Run './run_test.sh -b' first to do so"
  setup_python
  setup_python_nl
  if [ ! -d server/dist  ]
  then
    echo "no dist folder, please run ./run_test.sh -b to build js first."
    exit 1
  fi
  export FLASK_ENV=webdriver
  export GOOGLE_CLOUD_PROJECT=datcom-website-dev
  python3 -m pytest -n 10 --reruns 2 server/webdriver/tests/
}

# Run test for screenshot test codes.
function run_screenshot_test {
  printf '\n\e[1;35m%-6s\e[m\n\n' "!!! Have you generated the prod client packages? Run './run_test.sh -b' first to do so"
  setup_python
  setup_python_nl
  if [ ! -d server/dist  ]
  then
    echo "no dist folder, please run ./run_test.sh -b to build js first."
    exit 1
  fi
  export FLASK_ENV=webdriver
  export GOOGLE_CLOUD_PROJECT=datcom-website-dev
  export ENABLE_MODEL=true
  export MIXER_API_KEY=
  export PALM_API_KEY=
  python3 -m pytest server/webdriver/screenshot/
}

# Run integration test for NL interface
function run_integration_test {
  setup_python
  setup_python_nl
  export ENABLE_MODEL=true
  export FLASK_ENV=integration_test
  export GOOGLE_CLOUD_PROJECT=datcom-website-dev
  export TEST_MODE=test
  python3 -m pytest -vv server/integration_tests/

  # Tests within tools/nl/embeddings
  echo "Running tests within tools/nl/embeddings:"
  cd tools/nl/embeddings
  pip3 install -r requirements.txt
  python3 -m pytest *_test.py -s
}

function update_integration_test_golden {
  setup_python
  setup_python_nl
  export ENABLE_MODEL=true
  export FLASK_ENV=integration_test
  export GOOGLE_CLOUD_PROJECT=datcom-website-dev
  export TEST_MODE=write
  python3 -m pytest -vv server/integration_tests/
}

function run_all_tests {
  run_py_test
  run_npm_build
  run_webdriver_test
  run_npm_lint_test
  run_npm_test
  run_integration_test
}

function help {
  echo "Usage: $0 -pwblcsaf"
  echo "-p       Run server python tests"
  echo "-w       Run webdriver tests"
  echo "-i       Run integration tests"
  echo "-g       Update integration test golden files"
  echo "-o       Build for production (ignores dev dependencies)"
  echo "-b       Run client install and build"
  echo "-l       Run client lint test"
  echo "-c       Run client tests"
  echo "-a       Run all tests"
  echo "-f       Fix lint"
  exit 1
}

# Always reset the variable null.
while getopts tpwigotblcsaf OPTION; do
  case $OPTION in
    p)
        echo -e "### Running server tests"
        run_py_test
        ;;
    w)
        echo -e "### Running webdriver tests"
        run_webdriver_test
        ;;
    i)
        echo -e "### Running integration tests"
        run_integration_test
        ;;
    g)
        echo -e "### Updating integration test goldens"
        update_integration_test_golden
        ;;
    o)
        echo -e "### Production flag enabled"
        PROD=true
        ;;
    b)
        echo -e "### Build client-side packages"
        run_npm_build $PROD
        ;;
    l)
        echo -e "### Running lint"
        run_npm_lint_test
        ;;
    c)
        echo -e "### Running client tests"
        run_npm_test
        ;;
    s)
        echo -e "### Running screenshot tests"
        run_screenshot_test
        ;;
    f)
        echo -e "### Fix lint errors"
        run_lint_fix
        ;;
    a)
        echo -e "### Running all tests"
        run_all_tests
        ;;
    *)
        help
    esac
done

if [ $OPTIND -eq 1 ]
then
  help
fi
