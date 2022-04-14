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

FROM node:17.9.0-slim

# GCB should read files from /resources.
WORKDIR /resources

# Install curl.
RUN apt-get -y update
RUN apt-get -y install curl

# Download the latest package.json and package-lock.json from dc/website:master.
# package.json and package-lock.json are up-to-date as of the date the image is built.
# NOTE: both package.json and package-lock.json needed.
RUN curl -O https://raw.githubusercontent.com/datacommonsorg/website/master/static/package.json
RUN curl -O https://raw.githubusercontent.com/datacommonsorg/website/master/static/package-lock.json

# Install only the production dependencies using package.json.
RUN npm install

# Remove anything other than node_modules.
RUN rm -rf package.json package-lock.json