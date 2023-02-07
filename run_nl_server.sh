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

cd nl_server/
python3 -m pip install --upgrade pip

# Custom packages installation for nl_server.
echo "nl_server custom requirements installation: starting."
./requirements_install.sh
echo "nl_server custom requirements installation: done."
cd ..

python3 nl_app.py $PORT
