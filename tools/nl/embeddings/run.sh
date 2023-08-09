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
  echo "Usage: -bflc <embeddings-size>"
  echo "$0 -b <embeddings-size> # 'small' or 'medium'. This option uses the base default sentence_transformer model."
  echo "$0 -f <embeddings-size> # 'small' or 'medium'. This option uses the finetuned model on PROD."
  echo "$0 -l <embeddings-size> <local_model_path> # 'small' or 'medium'. This option uses the locally stored model to build the embeddings."
  echo "$0 -c <embeddings-size> <sheets_url> <worksheet_name> <local_file_for_sheets_data_download> # This option creates custom embeddings (using the finetuned model in PROD)."
}

if [[ $# -le 1 ]]; then
  help
  exit 1
fi

while getopts bflc OPTION; do
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

    c) 
      echo -e "### Using the finetuned model from prod with custom embeddings-size"
      SHEETS_URL="$3"
      if [ "$SHEETS_URL" == "" ]; then
        help
        exit 1
      else  
        echo "Using the sheets url: $SHEETS_URL"
      fi  
      WORKSHEET_NAME="$4"
      if [ "$WORKSHEET_NAME" == "" ]; then
        help  
        exit 1
      else 
        echo "Using the worksheet name: $WORKSHEET_NAME"
      fi
      LOCAL_CSV_FILE_FOR_SHEETS_DATA_DOWNLOAD="$5"
      if [ "$LOCAL_CSV_FILE_FOR_SHEETS_DATA_DOWNLOAD" == "" ]; then
        help  
        exit 1
      else 
        echo "Using the following local filename to download the latest sheets data to: $LOCAL_CSV_FILE_FOR_SHEETS_DATA_DOWNLOAD"
      fi
      FINETUNED_MODEL=$(curl -s https://raw.githubusercontent.com/datacommonsorg/website/master/deploy/nl/models.yaml | awk '$1=="tuned_model:"{ print $2; }')
      if [ "$FINETUNED_MODEL" == "" ]; then
        echo "Using option -c but could not retrieve an existing finetuned model from prod."
        exit 1
      else
        echo "Found finetuned model on prod: $FINETUNED_MODEL"
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

if [ "$SHEETS_URL" != "" ]; then
  python3 build_embeddings.py --embeddings_size=$2 --finetuned_model_gcs=$FINETUNED_MODEL --sheets_url=$SHEETS_URL --worksheet_name=$WORKSHEET_NAME --local_sheets_csv_filepath=$LOCAL_CSV_FILE_FOR_SHEETS_DATA_DOWNLOAD
elif [ "$FINETUNED_MODEL" != "" ]; then
  python3 build_embeddings.py --embeddings_size=$2 --finetuned_model_gcs=$FINETUNED_MODEL
elif [ "$LOCAL_MODEL_PATH" != "" ]; then
  python3 build_embeddings.py --embeddings_size=$2 --existing_model_path=$LOCAL_MODEL_PATH
else
  python3 build_embeddings.py --embeddings_size=$2
fi
