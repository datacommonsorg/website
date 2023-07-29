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

FROM envoyproxy/envoy:v1.22.0 AS envoy

FROM gcr.io/datcom-ci/datacommons-mixer-base:latest as mixer-base

FROM nikolaik/python-nodejs:python3.11-nodejs18 as base

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

FROM base as server

# Run server
WORKDIR /workspace
CMD exec gunicorn --timeout 120 --bind :8080 -w 4 web_app:app

# Compose of mixer, esp and website
FROM base as website-compose
WORKDIR /workspace

COPY --from=mixer-base /mixer/internal/ /mixer/internal
COPY --from=mixer-base /mixer/esp/ /mixer/esp
COPY --from=mixer-base /mixer/mixer-grpc.pb mixer-grpc.pb
COPY --from=mixer-base /go/bin/mixer /go/bin/mixer
COPY --from=envoy /usr/local/bin/envoy /usr/local/bin/envoy

COPY build/web_server/compose.sh .
EXPOSE 8080 8081
CMD ./compose.sh $USE_SQLITE $SQLITE_PATH
