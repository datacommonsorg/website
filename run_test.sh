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

# Run linter on client side code
function run_npm_lint {
  cd static
  npm run lint && npm run tslint
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
  python3 -m pytest
  cd ..
}

function run_all_tests {
  run_py_test
  run_npm_build
  run_npm_lint
  run_npm_test
}

function help {
  echo "Usage: $0 -pblca"
  echo "-p       Run server python tests"
  echo "-b       Run client install and build"
  echo "-l       Run client lint"
  echo "-c       Run client tests"
  echo "-a       Run all tests"
  echo "No args  Run all tests"
  exit 1
}

while getopts pblca OPTION; do
  case $OPTION in
    p)
        echo -e "### Running server tests"
        run_py_test
        ;;
    b)
        echo -e "### Build client-side packages"
        run_npm_build
        ;;
    l)
        echo -e "### Running client-side lint"
        run_npm_lint
        ;;
    c)
        echo -e "### Running client tests"
        run_npm_test
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