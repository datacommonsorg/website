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

# First check if local NL server is running!
curl http://localhost:6060/healthz 2>/dev/null
if [ $? -ne 0 ]; then
  echo "Is the local NL server running?  Run './run_nl_server opt' first!"
  echo "(Note the 'opt' arg!)"
  echo ""
  exit -1
fi

python3 -m venv .env
source .env/bin/activate
pip3 install -r requirements.txt

if [[ "$1" != "" ]]; then
  python3 vartest.py --run_name=$1
else
  python3 vartest.py
fi
