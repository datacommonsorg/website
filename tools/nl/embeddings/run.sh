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
  echo "Usage: -lce <embeddings-size>"
  echo "$0 -c <embeddings-size> # This option creates custom embeddings (using the finetuned model in PROD)."
  echo "$0 -l <embeddings-size> <lancedb_output_path> # This option is used to generate the lanceDB index."
  echo "$0 -e <embeddings-size> <vertex_ai_endpoint_id> # This option creates embeddings using a Vertex AI model endpoint."
}

if [[ $# -le 1 ]]; then
  help
  exit 1
fi

FINETUNED_MODEL=ft_final_v20230717230459.all-MiniLM-L6-v2
EMBEDDINGS_SIZE=$2

while getopts elc OPTION; do
  case $OPTION in
    e)
        MODEL_ENDPOINT_ID="$3"
        if [[ "$MODEL_ENDPOINT_ID" == "" ]]; then
          help
          exit 1
        else
          echo -e "### Using Vertex AI model endpoint $MODEL_ENDPOINT_ID"
        fi
        ;;
    l)
        echo -e "### Generating LanceDB index"
        LANCEDB_OUTPUT_PATH="$3"
        if [[ "$LANCEDB_OUTPUT_PATH" == "" ]]; then
          help
          exit 1
        else
          echo "Generating LanceDB index inside: $LANCEDB_OUTPUT_PATH"
        fi
        ;;
    c)
        echo -e "### Using the finetuned model from prod with custom embeddings-size"
        ;;
    *)
        help
    esac
done

cd ../../..
python3 -m venv .env
source .env/bin/activate
pip3 install torch==2.2.2 --extra-index-url https://download.pytorch.org/whl/cpu -q
pip3 install -r tools/nl/embeddings/requirements.txt -q

export TOKENIZERS_PARALLELISM=false

if [[ "$MODEL_ENDPOINT_ID" != "" ]];then
  python3 -m tools.nl.embeddings.build_embeddings \
    --embeddings_size=$EMBEDDINGS_SIZE \
    --vertex_ai_prediction_endpoint_id=$MODEL_ENDPOINT_ID
elif [[ "$LANCEDB_OUTPUT_PATH" != "" ]]; then
  python3 -m tools.nl.embeddings.build_embeddings \
    --embeddings_size=$EMBEDDINGS_SIZE \
    --finetuned_model_gcs=$FINETUNED_MODEL \
    --lancedb_output_path=$LANCEDB_OUTPUT_PATH \
    --dry_run=True
else
  python3 -m tools.nl.embeddings.build_embeddings \
    --embeddings_size=$EMBEDDINGS_SIZE \
    --finetuned_model_gcs=$FINETUNED_MODEL
fi

cd tools/nl/embeddings