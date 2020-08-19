#!/bin/bash

# Copyright 2020 Google LLC
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
    echo "\nFix lint errors by running ./run_test.sh -f"
    exit 1
  fi
  cd ..
}

# Fixes client side lint
function run_npm_lint_fix {
  cd static
  npm list eslint || npm install eslint
  npm run lint
  cd ..
}

# Build client side code
function run_npm_build {
  cd static
  npm install
  npm run-script build
  cd ..
}

# Run test for server side code.
function run_py_test {
  python3 -m venv .env
  source .env/bin/activate
  cd server
  export FLASK_ENV=test
  pip3 install -r requirements.txt -q
  python3 -m pytest tests/**.py
  cd ..
}

# Run test for webdriver automation test codes.
function run_webdriver_test {
  python3 -m venv .env
  source .env/bin/activate
  cd server
  if [ ! -d dist  ]
  then
    echo "no dist folder, please run ./run_test.sh -b to build js first."
    exit 1
  fi
  export FLASK_ENV=WEBDRIVER
  export GOOGLE_CLOUD_PROJECT=datcom-browser-staging
  pip3 install -r requirements.txt -q
  python3 -m pytest webdriver_tests/*.py
  cd ..
}

function run_screenshot_test {
  python3 -m venv .env
  source .env/bin/activate
  cd server
  if [ ! -d dist  ]
  then
    echo "no dist folder, please run ./run_test.sh -b to build js first."
    exit 1
  fi
  export FLASK_ENV=WEBDRIVER
  export GOOGLE_CLOUD_PROJECT=datcom-browser-staging
  pip3 install -r requirements.txt -q
  if [  -d test_screenshots  ]
  then
    echo "Delete the test_screenshots folder"
    rm -rf test_screenshots
  fi
  mkdir test_screenshots
  python3 -m pytest webdriver_tests/screenshot/screenshot_test.py
  cd ..
}

function run_all_tests {
  run_py_test
  run_npm_build
  run_webdriver_test
  run_screenshot_test
  run_npm_lint_test
  run_npm_test
}

function help {
  echo "Usage: $0 -pwblcsaf"
  echo "-p       Run server python tests"
  echo "-w       Run webdriver tests"
  echo "-b       Run client install and build"
  echo "-l       Run client lint test"
  echo "-c       Run client tests"
  echo "-s       Run screenshot tests"
  echo "-a       Run all tests"
  echo "-f       Fix client lint"
  echo "No args  Run all tests"
  exit 1
}

while getopts pwblcsaf OPTION; do
  case $OPTION in
    p)
        echo -e "### Running server tests"
        run_py_test
        ;;
    w)
        echo -e "### Running webdriver tests"
        run_webdriver_test
        ;;
    b)
        echo -e "### Build client-side packages"
        run_npm_build
        ;;
    l)
        echo -e "### Running client-side lint"
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
        run_npm_lint_fix
        ;;
    a)
        echo -e "### Running all tests"
        run_all_tests
        ;;
    *)
        help
    esac
done

if [ $OPTIND -eq 1 ]; then
  help
fi