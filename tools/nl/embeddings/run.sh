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
  echo "Usage: -bf <embeddings-size> # 'small' or 'medium'"
  echo "$0 -b <embeddings-size> # 'small' or 'medium'. This option uses the base default sentence_transformer model."
  echo "$0 -f <embeddings-size> # 'small' or 'medium'. This option uses the finetuned model on PROD."
  echo "$0 -l <embeddings-size> <local_model_path> # 'small' or 'medium'. This option uses the locally stored model to build the embeddings."
}

# Must provide the test index file.
if [[ $# -le 2 ]]; then
  help
  exit 1
fi

while getopts bfl OPTION; do
  case $OPTION in
    b)
        echo -e "### Using the base default sentence_transformer model"
        FINETUNED_MODEL=""
        ;;
    f)
        echo -e "### Using the finetuned model from prod"
        FINETUNED_MODEL=$(curl -s https://raw.githubusercontent.com/datacommonsorg/website/master/deploy/nl/models.yaml | awk '$1=="tuned_model:"{ print $2; }')
        if [ "$FINETUNED_MODEL" == "" ]; then
          echo "Using option -f but could not retrieve an existing finetuned model from prod."
          exit 1
        else
          echo "Found finetuned model on prod: $FINETUNED_MODEL"
        fi
        ;;
    l)
        echo -e "### Using the provided local model"
        LOCAL_MODEL_PATH="$3"
        if [ "$LOCAL_MODEL_PATH" == "" ]; then
          help
          exit 1
        else
          echo "Using the local model at: $LOCAL_MODEL_PATH"
        fi
        ;;


    *)
        help
    esac
done

python3 -m venv .env
source .env/bin/activate
python3 -m pip install --upgrade pip setuptools light-the-torch
ltt install torch --cpuonly
pip3 install -r requirements.txt

if [ "$FINETUNED_MODEL" != "" ]; then
  python3 build_embeddings.py --embeddings_size=$2 --finetuned_model_gcs=$FINETUNED_MODEL
elif [ "$LOCAL_MODEL_PATH" != "" ]; then
  python3 build_embeddings.py --embeddings_size=$2 --existing_model_path=$LOCAL_MODEL_PATH
else
  python3 build_embeddings.py --embeddings_size=$2
fi
