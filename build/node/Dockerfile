# Copyright 2022 Google LLC
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

FROM node:18.4.0-slim

# Install curl.
RUN apt-get -y update
RUN apt-get -y install curl

# static
COPY static/package.json /resources/static/package.json
COPY static/package-lock.json /resources/static/package-lock.json

# client
COPY packages/client/package.json /resources/packages/client/package.json
COPY packages/client/package-lock.json /resources/packages/client/package-lock.json

# web-components
COPY packages/web-components/package.json /resources/packages/web-components/package.json
COPY packages/web-components/package-lock.json /resources/packages/web-components/package-lock.json

WORKDIR /resources/static

RUN npm install && rm -rf package.json package-lock.json
WORKDIR /resources/packages/client
RUN npm install && rm -rf package.json package-lock.json
WORKDIR /resources/packages/web-components
RUN npm install && rm -rf package.json package-lock.json

WORKDIR /resources
