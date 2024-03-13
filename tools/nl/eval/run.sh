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


set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="${DIR%/*/*/*}"

function help {
  echo "Usage: $0 -mf"
  echo "-m The model name to be used. Options can be found in vertex_ai_endpoints.yaml"
  echo "-f The eval folder path. The folder should have a golden.json file"
  exit 1
}

while getopts ":m:f:" OPTION; do
  case $OPTION in
    m)
      MODEL_NAME=$OPTARG
      ;;
    f)
      FOLDER=$OPTARG
      ;;
    *)
      help
      ;;
  esac
done

cd $ROOT
source .env/bin/activate
pip3 install -r $DIR/requirements.txt
python3  -m tools.nl.eval.main --model_name=$MODEL_NAME --eval_folder=$FOLDER
deactivate