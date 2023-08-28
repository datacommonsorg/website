# Copyright 2023 Google LLC
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


FROM nikolaik/python-nodejs:python3.11-nodejs18-slim as base

RUN apt-get update && apt-get -y upgrade

ARG ENV
ENV ENV=${ENV}

WORKDIR /workspace

COPY web_app.py /workspace/web_app.py
COPY server/requirements.txt /workspace/server/requirements.txt
RUN pip install --upgrade pip
RUN pip install --upgrade setuptools
# --no-cache-dir removes ~/.cache files, which can be a few GB.
RUN pip3 install --no-cache-dir -r /workspace/server/requirements.txt

COPY static/package.json /workspace/static/package.json
COPY static/package-lock.json /workspace/static/package-lock.json
WORKDIR /workspace/static
RUN npm install --omit=dev

# NPM
COPY static/. /workspace/static/
RUN npm run-script build

# Flask
COPY server/. /workspace/server/
COPY shared/. /workspace/shared/
WORKDIR /workspace
CMD exec gunicorn --preload --timeout 1000 --bind :8080 -w 4 web_app:app
