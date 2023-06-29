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

function help {
  echo "Usage: "
  echo "$0 -f [<tuned_intermediate_model_path_on_gcs>] # finetunes the existing finetuned intermediate model; uses prod by default unless provided here (final stage only)"
  echo "$0 -i # the complete finetuning procedure (both stages: intermediate -> final)"
}

STAGE=""
while getopts fi OPTION; do
  case $OPTION in
    f)
        echo -e "### Finetuning an existing tuned_alternatives model (final stage only)"
        STAGE="final"
        INTERMEDIATE_FINETUNED_MODEL="$2"
        ;;
    i)
        echo -e "### Starting the complete finetuning procedure (both stages: alternatives -> final)"
        STAGE="intermediate"
        ;;
    *)
        help
    esac
done

if [ "$STAGE" == "" ]; then
  help
  exit 1
fi

# Get the model finetuned on sentence alternatives.
if [ "$2" != "" ]; then
  INTERMEDIATE_FINETUNED_MODEL="$2"
else
  INTERMEDIATE_FINETUNED_MODEL=$(curl -s https://raw.githubusercontent.com/datacommonsorg/website/master/deploy/nl/models.yaml | awk '$1=="tuned_model:"{ print $2; }' | cut -f2- -d'.')
fi

cd ../
python3 -m venv .env
source .env/bin/activate
python3 -m pip install --upgrade pip setuptools light-the-torch
ltt install torch --cpuonly
pip3 install -r requirements.txt
python3 -m finetuning.finetune --stage=$STAGE --pretuned_model="$INTERMEDIATE_FINETUNED_MODEL"
