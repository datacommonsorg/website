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

set -e

python3 -m venv .env
source .env/bin/activate

PORT=6060
export GOOGLE_CLOUD_PROJECT=datcom-website-dev
export FLASK_ENV=local
echo "Starting localhost with FLASK_ENV='$FLASK_ENV' on port='$PORT'"

python3 -m pip install --upgrade pip
pip3 install -r nl_server/requirements.txt -q

# Downloading the named-entity recognition (NER) library spacy and the large EN model
# using the guidelines here: https://spacy.io/usage/models#production
# Unfortunately, pip is not able to recognize this data (as a library) as part of 
# requirements.txt and will try to download a new version every single time.
# Reason for doing this here is that if the library is already installed, no need
# to download > 560Mb file. 
if python3 -c "import en_core_web_lg" &> /dev/null; then
    echo 'NER model (en_core_web_lg) already installed.'
else
    echo 'Installing the NER model: en_core_web_lg'
    pip3 install $(spacy info en_core_web_lg --url)
fi
cd nl_server/
python3 main.py $PORT
cd ..
