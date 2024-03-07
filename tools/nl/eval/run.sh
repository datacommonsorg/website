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


function help {
  echo "Usage: $0 -mf"
  echo "-m The model name to be used. Options can be found in vertex_ai_endpoints.yaml"
  echo "-f The sub folder name of a eval. The folder should have a golden.json file"
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

# cd ../../..
# python3 -m venv .env
# source .env/bin/activate
# cd tools/nl/eval
# pip3 install -r requirements.txt

python3 main.py --model_name=$MODEL_NAME --eval_folder=$FOLDER

