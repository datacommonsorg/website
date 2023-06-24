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

ERR=true
if [ "$1" == "-f" ] || [ "$1" == "-a" ]; then
  if [ "$1" == "-f" ] && [ "$2" != "" ]; then
    STAGE="final"
    TUNED_ALT_MODEL="$2"
    ERR=false
  elif [ "$1" == "-a" ]; then
    STAGE="alternatives"
    TUNED_ALT_MODEL=""
    ERR=false
  fi
fi

if [ "$ERR" == true ]; then
    echo "Usage pattern # 1: $0 -f <tuned_alternatives_model_path_on_gcs>  # finetunes an existing tuned_alternatives model (final stage only)"
    echo "Usage pattern # 1: $0 -a # the complete finetuning procedure (both stages: alternatives -> final)" 
  exit 1
fi

cd ../
python3 -m venv .env
source .env/bin/activate
# python3 -m pip install --upgrade pip setuptools light-the-torch
# ltt install torch --cpuonly
# pip3 install -r requirements.txt
python3 -m finetuning.finetune --stage=$STAGE --pretuned_model="$TUNED_ALT_MODEL"
