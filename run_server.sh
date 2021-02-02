#!/bin/bash
# Copyright 2020 Google LLC
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

export GOOGLE_CLOUD_PROJECT=datcom-website-staging
if [[ $1 == "lite" ]]
then
  export FLASK_ENV=development-lite
else
  export FLASK_ENV=development
fi

pip3 install -r server/requirements.txt -q
cd server
python3 main.py
cd ..
