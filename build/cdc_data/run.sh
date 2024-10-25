#!/bin/bash
# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -e

echo "LOCALLOCALLOCALLOCALLOCALLOCALLOCALLOCALLOCALLOCALLOCALLOCAL"

# Check for required variables.

if [[ $DC_API_KEY == "" ]]; then
  echo "DC_API_KEY not specified."
  exit 1
fi

if [[ $INPUT_DIR == "" ]]; then
    echo "INPUT_DIR not specified."
    exit 1
fi

if [[ $OUTPUT_DIR == "" ]]; then
    echo "OUTPUT_DIR not specified."
    exit 1
fi

if [[ $DATA_RUN_MODE != "" ]]; then
    if [[ $DATA_RUN_MODE != "schemaupdate" ]]; then
      echo "DATA_RUN_MODE must be either empty or 'schemaupdate'"
      exit 1
    fi
    echo "DATA_RUN_MODE=$DATA_RUN_MODE"
else
  DATA_RUN_MODE="customdc"
fi

echo "INPUT_DIR=$INPUT_DIR"
echo "OUTPUT_DIR=$OUTPUT_DIR"

# Local variables

# Capture the workspace directory.
# Used for changing directories for running scripts.
WORKSPACE_DIR=$(pwd)

# Paths based off of OUTPUT_DIR.
DC_OUTPUT_DIR=$OUTPUT_DIR/datacommons
DC_NL_EMBEDDINGS_DIR=$DC_OUTPUT_DIR/nl/embeddings
ADDITIONAL_CATALOG_PATH=$DC_NL_EMBEDDINGS_DIR/custom_catalog.yaml

# The custom embeddings index type.
# See: https://github.com/datacommonsorg/website/blob/2dabf815b82dcd5ff226ed94d8bbdab545ffd4d7/nl_server/custom_dc_env.yaml#L6
CUSTOM_EMBEDDINGS_INDEX=user_all_minilm_mem

# Set IS_CUSTOM_DC var to true.
# This is used by the embeddings builder to set up a custom dc env.
export IS_CUSTOM_DC=true

if [[ $USE_SQLITE == "true" ]]; then
    # Set SQLITE_PATH for sqlite imports.
    # This is used by the simple importer.
    export SQLITE_PATH=$DC_OUTPUT_DIR/datacommons.db
    echo "SQLITE_PATH=$SQLITE_PATH"
fi

# cd into simple importer dir to run the importer.
cd $WORKSPACE_DIR/import/simple

# Run importer.
python3 -m stats.main \
    --input_dir=$INPUT_DIR \
    --output_dir=$DC_OUTPUT_DIR \
    --mode=$DATA_RUN_MODE

# cd back to workspace dir to run the embeddings builder.
cd $WORKSPACE_DIR

if [[ $DATA_RUN_MODE == "schemaupdate" ]]; then
    echo "Skipping embeddings builder because run mode is 'schemaupdate'."
    echo "Schema update complete."
else
    # Run embeddings builder.
    python3 -m tools.nl.embeddings.build_embeddings \
        --embeddings_name=$CUSTOM_EMBEDDINGS_INDEX \
    --output_dir=$DC_NL_EMBEDDINGS_DIR \
    --additional_catalog_path=$ADDITIONAL_CATALOG_PATH
  echo "Data loading completed."
fi
