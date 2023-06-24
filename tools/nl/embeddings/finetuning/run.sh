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

if [[ "$1" != "" ]]; then
  if [ "$1" != "alternatives" ] && [ "$1" != "base" ]; then
    echo "Usage pattern # 1: $0   # In this case 'STAGE' is set to 'alternatives'."
    echo "Usage pattern # 2: $0 <STAGE>  # options: 'alternatives' or 'base'"
    exit 1
  else
    STAGE="$1"
  fi
else
    STAGE="alternatives"
fi

cd ../
python3 -m venv .env
source .env/bin/activate
python3 -m pip install --upgrade pip setuptools light-the-torch
ltt install torch --cpuonly
pip3 install -r requirements.txt

# Get the model finetuned on sentence alternatives.
MODEL_FINETUNED_ALTS=$(curl -s https://raw.githubusercontent.com/datacommonsorg/website/master/deploy/base/model.yaml | awk '$1=="finetuned_alternatives_model:"{ print $2; }')

if [$MODEL_FINETUNED_ALTS == ""]; then
  echo "Could not find a pre-finetuned model with alternative sentences."
  echo "Try usage pattern # 2 to finetune from a base model: $0 base"
  exit 1
fi
python3 -m finetuning.finetune --stage=$STAGE --stage_alternatives_model="$MODEL_FINETUNED_ALTS"