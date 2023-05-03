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

# For the local server, filter out the en_code_web* packages which are simply
# the NER models bundled as packages. They are conditionally installed below.

pip3 install light-the-torch
ltt install torch --cpuonly
V=`cat requirements.txt | grep -v en_core_web > requirements_filtered.txt`
pip3 install -r requirements_filtered.txt
rm requirements_filtered.txt

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
