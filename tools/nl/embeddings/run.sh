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

# Usage function
usage() {
  echo "Usage: $0 --embeddings_name <embeddings-name> --output_dir <output_dir>"
  exit 1
}

# Parse options
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --embeddings_name)
        embeddings_name="$2"
        shift 2
        ;;
    --output_dir)
        output_dir="$2"
        shift 2
        ;;
    *)
        echo "Unknown option: $1"
        usage
        ;;
  esac
done

if [ -z "$output_dir" ]; then
  output_dir="gs://datcom-nl-models/${embeddings_name}_$(date +'%Y_%m_%d_%H_%M_%S')/"
fi

# Print options
echo "Embeddings name: $embeddings_name"
echo "Output directory: $output_dir"

cd ../../..
python3 -m venv .env
source .env/bin/activate
pip3 install -r tools/nl/embeddings/requirements.txt -q

export TOKENIZERS_PARALLELISM=false

python3 -m tools.nl.embeddings.build_embeddings \
  --embeddings_name=$embeddings_name \
  --output_dir=$output_dir

deactivate
cd tools/nl/embeddings