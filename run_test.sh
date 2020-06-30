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

# Run test for client side code.
cd static
npm run lint && npm run test
cd ..

# Run test for server side code.
python3 -m venv .env
source .env/bin/activate
cd server
export FLASK_ENV=test
pip3 install -r requirements.txt
python3 -m pytest
cd ..