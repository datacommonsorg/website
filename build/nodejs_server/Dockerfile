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

FROM node:18.14.0-slim

RUN apt-get update && apt-get -y upgrade
RUN apt-get install -y python3 pkg-config build-essential libpixman-1-dev libcairo2-dev libpango1.0-dev
# install roboto font in the container so that nodejs server can use it when
# drawing the charts.
RUN apt-get install -y fonts-roboto

ARG ENV
ENV ENV=${ENV}

WORKDIR /workspace

# Build packages/web-components and packages/client dependencies
COPY packages/. /workspace/packages/
RUN npm --prefix /workspace/packages/web-components install --omit=dev
RUN npm --prefix /workspace/packages/web-components run build
RUN npm --prefix /workspace/packages/client install
RUN npm --prefix /workspace/packages/client run build

# Install nodejs server dependencies
COPY static/package.json /workspace/static/package.json
COPY static/package-lock.json /workspace/static/package-lock.json
RUN npm --prefix /workspace/static install --omit=dev

COPY static/. /workspace/static/

WORKDIR /workspace/static

# Expose the port that the Node.js application will listen on.
# Important to use 8080 for health check.
EXPOSE 8080
# Run nodejs server
# TODO: Check best practices for starting a typescript NodeJS app.
CMD npx ts-node ./src/server.ts