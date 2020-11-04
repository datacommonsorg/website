# Copyright 2020 Google LLC
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

FROM node:12

# GCB should read files from /resources.
WORKDIR /resources

# Install the zip app.
RUN apt-get -y update
RUN apt-get -y install zip

# Download the latest package.json from dc/website:master.
# package.json is up-to-date as of the date the image is built.
RUN curl -O https://raw.githubusercontent.com/datacommonsorg/website/master/static/package-lock.json
RUN curl -O https://raw.githubusercontent.com/datacommonsorg/website/master/static/package.json


# Install only the prodution dependencies using package.json.
RUN npm install --only=prod

# Zip node_modules/ for to generate a smaller Docker image.
RUN zip -r node_modules.zip node_modules

# Only keep node_modules.zip inside.
# Remove everything else.
RUN rm -rf node_modules package.json