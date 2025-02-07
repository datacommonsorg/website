# Copyright 2024 Google LLC
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

# #### Stage 1: Build mixer. ####
FROM golang:1.20.7 AS mixer

WORKDIR /workspace

# Install the protobuf compiler and Go plugins.
RUN apt-get update \
    && apt-get install -y protobuf-compiler \
    && go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.30.0 \
    && go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.3.0

COPY mixer/go.mod mixer/go.sum ./
RUN go mod download -x

# Copy files
COPY mixer/proto/ proto
COPY mixer/internal/ internal
COPY mixer/cmd/ cmd
COPY mixer/esp/ esp

# Build protobuf.
RUN protoc \
    --include_source_info \
    --include_imports \
    --proto_path=proto \
    --go_out=paths=source_relative:internal/proto \
    --go-grpc_out=paths=source_relative:internal/proto \
    --go-grpc_opt=require_unimplemented_servers=false \
    --experimental_allow_proto3_optional \
    --descriptor_set_out mixer-grpc.pb \
    proto/*.proto proto/**/*.proto

# Build mixer.
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/mixer cmd/main.go


# #### Stage 2: Build python servers (website and NL). ####
FROM --platform=linux/amd64 python:3.11.4-slim as py-servers

ARG PIP_DISABLE_PIP_VERSION_CHECK=1
ARG PIP_NO_CACHE_DIR=1

WORKDIR /workspace

# Install git which is needed to install web server requirements
RUN apt-get update && apt-get -y upgrade && apt-get install -y git

# Copy requirements.
# Copy nl_requirements.txt since it is referenced by embeddings requirements.txt
COPY server/requirements.txt ./server/requirements.txt
COPY nl_server/requirements.txt ./nl_server/requirements.txt
COPY nl_requirements.txt ./nl_requirements.txt

# Create a virtual env and install requirements.
RUN python -m venv ./venv
ENV PATH="/workspace/venv/bin:$PATH"
RUN pip3 install --upgrade pip setuptools \
    && pip3 install torch==2.2.2 --extra-index-url https://download.pytorch.org/whl/cpu \
    && pip3 install --no-cache-dir -r /workspace/server/requirements.txt \
    && pip3 install --no-cache-dir -r /workspace/nl_server/requirements.txt

# Copy website app script.
COPY web_app.py ./web_app.py
# Copy server module.
COPY server/. ./server/
# Copy NL app script.
COPY nl_app.py ./nl_app.py
# Copy nl_server module.
COPY nl_server/. ./nl_server/
# Copy the shared module.
COPY shared/. ./shared/
# Copy yaml files.
COPY deploy/nl/. /datacommons/nl/


# #### Stage 3: Build static website assets. ####
FROM --platform=linux/amd64 node:20 as static

WORKDIR /workspace

# Insall npm dependencies.
COPY packages/web-components/package.json ./packages/web-components/package.json
COPY packages/web-components/package-lock.json ./packages/web-components/package-lock.json

COPY packages/client/package.json ./packages/client/package.json
COPY packages/client/package-lock.json ./packages/client/package-lock.json

COPY static/package.json ./static/package.json
COPY static/package-lock.json ./static/package-lock.json

RUN npm --prefix /workspace/packages/web-components ci --omit=dev \
    && npm --prefix /workspace/packages/client ci \
    && npm --prefix /workspace/static ci --omit=dev

# Build static assets.
COPY packages/. ./packages/
COPY static/. ./static/
WORKDIR /workspace/static
RUN npm run-script build


# #### Stage 4: Download base dc model and embeddings from GCS. ####
FROM --platform=linux/amd64 google/cloud-sdk:slim as download

# Copy model and embeddings.
RUN mkdir -p /tmp/datcom-nl-models \
    && gsutil -m cp -R gs://datcom-nl-models/ft_final_v20230717230459.all-MiniLM-L6-v2/ /tmp/datcom-nl-models/ \
    && gsutil cp -R gs://datcom-nl-models/embeddings_medium_2024_05_09_18_01_32.ft_final_v20230717230459.all-MiniLM-L6-v2.csv /tmp/datcom-nl-models/


# #### Final stage: Runtime env. ####
FROM gcr.io/datcom-ci/datacommons-services-runtime:2024-08-08 as runner

# Env defaults.
ENV WEBSITE_MIXER_API_ROOT=http://127.0.0.1:8081 \
    ENV_PREFIX=Compose \
    FLASK_ENV=custom \
    ENABLE_ADMIN=false \
    DEBUG=false \
    USE_SQLITE=false \
    USE_CLOUDSQL=false \
    DC_API_ROOT=https://api.datacommons.org \
    ENABLE_MODEL=true

WORKDIR /workspace

# Copy scripts, dependencies and files from build stages and from local file system.
# Mixer.
COPY --from=mixer /workspace/bin/ bin
COPY --from=mixer /workspace/esp/ esp
COPY --from=mixer /workspace/internal/ internal
COPY --from=mixer /workspace/mixer-grpc.pb .
# nginx.
COPY build/cdc_services/nginx.conf .
# Website and NL servers.
COPY --from=py-servers /workspace/ .
COPY --from=py-servers /datacommons/ /datacommons
# Static website assets.
COPY --from=static /workspace/server ./server
# Downloaded model and embeddings.
COPY --from=download /tmp/datcom-nl-models /tmp/datcom-nl-models

# Copy executable script.
COPY build/cdc_services/run.sh .

# Make script executable.
RUN chmod +x run.sh

# Add virtual env to the path.
ENV PATH="/workspace/venv/bin:$PATH"

# Set the default command to run the script.
CMD ./run.sh