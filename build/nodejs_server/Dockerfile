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

FROM node:18.4.0

ARG ENV
ENV ENV=${ENV}

WORKDIR /workspace

# Install dependencies
COPY static/package.json /workspace/static/package.json
COPY static/package-lock.json /workspace/static/package-lock.json
WORKDIR /workspace/static
RUN npm install --omit=dev

COPY static/. /workspace/static/
# Expose the port that the Node.js application will listen on.
# Important to use 8080 for health check.
EXPOSE 8080
# Run nodejs server
# TODO: Check best practices for starting a typescript NodeJS app.
CMD npx ts-node ./src/server.ts