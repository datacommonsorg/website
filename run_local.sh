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


pip3 install -r requirements.txt
protoc -I=./ --python_out=./ ./*.proto

# For developers with permission, they can run the app locally and read the
# placeid2dcid.json from GCS.
# When deploying a new file to GCS, first make sure it runs in local and staging,
# then copy it over to prod bucket.
gcloud config set project datcom-browser-staging
gcloud auth application-default login

export FLASK_ENV=development
python3 main.py
