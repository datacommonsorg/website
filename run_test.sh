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

export NODE_OPTIONS=--openssl-legacy-provider

function setup_python {
  python3 -m venv .env
  source .env/bin/activate
  python3 -m pip install --upgrade pip
  pip3 install -r server/requirements.txt -q

  # For the local server, filter out the en_code_web* packages which are simply
  # the NER models bundled as packages. They are conditionally installed below.
  V=`cat nl_server/requirements.txt | grep -v en_core_web > requirements_filtered.txt`
  pip3 install -r requirements_filtered.txt -q
  rm requirements_filtered.txt

  # Downloading the named-entity recognition (NER) library spacy and the large EN model
  # using the guidelines here: https://spacy.io/usage/models#production
  # Unfortunately, pip is not able to recognize this data (as a library) as part of
  # requirements.txt and will try to download a new version every single time.
  # Reason for doing this here is that if the library is already installed, no need
  # to download > 560Mb file.
  if python3 -c "import en_core_web_lg" &> /dev/null; then
      echo 'NER model (en_core_web_lg) already installed.'
  else
      echo 'Installing the NER model: en_core_web_lg'
      pip3 install $(spacy info en_core_web_lg --url)
fi
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
    npm install --only=prod
  else
    npm install
  fi
  npm run-script build
  cd ..
}

# Run test and check lint for Python code.
function run_py_test {
  setup_python
  export FLASK_ENV=test
  python3 -m pytest server/tests/ -s --ignore=sustainability

  # TODO(beets): add tests for other private dc instances
  # export FLASK_ENV=test-sustainability
  # python3 -m pytest tests/sustainability/**.py
  python3 -m pytest shared/tests/ -s

  cd nl_server
  # Custom packages installation for nl_server.
  echo "nl_server custom requirements installation: starting."
  ./requirements_install.sh
  echo "nl_server custom requirements installation: done."
  cd ..
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
  if [ ! -d server/dist  ]
  then
    echo "no dist folder, please run ./run_test.sh -b to build js first."
    exit 1
  fi
  export FLASK_ENV=webdriver
  export GOOGLE_CLOUD_PROJECT=datcom-website-dev
  python3 -m pytest -n 10 --reruns 2 server/webdriver_tests/tests/
}

# Run integration test for NL interface
function run_integration_test {
  setup_python
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
