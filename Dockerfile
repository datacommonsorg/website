# Copyright 2019 Google LLC
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


# Build client side code
FROM node:15-slim AS node
WORKDIR /website
COPY go/ /website/go/
COPY static/package.json /website/static/package.json
COPY static/package-lock.json /website/static/package-lock.json

WORKDIR /website/static
RUN npm install
COPY static/ /website/static/
RUN npm run-script build


# Build server side code
FROM python:3.7
WORKDIR /website
COPY --from=node /website/ /website/
COPY server/requirements.txt /website/server/requirements.txt
RUN pip3 install -r /website/server/requirements.txt
COPY server/ /website/server/

# Run the web service on container startup.
WORKDIR /website/server
CMD exec gunicorn --bind :8080 --workers 1 --threads 8 --timeout 0 main:app