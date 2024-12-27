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

cd ../
python3 -m venv .env
source .env/bin/activate
cd model_server
python3 -m pip install --upgrade pip
pip3 install torch==2.2.2 --extra-index-url https://download.pytorch.org/whl/cpu
pip3 install -r requirements.txt

export MODEL_NAME=${1:-"cross-encoder/ms-marco-MiniLM-L-6-v2"}
python3 main.py