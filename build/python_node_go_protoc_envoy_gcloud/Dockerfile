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


FROM python:3.11.4-slim as base

# Env setup
# Node
ENV NODE_VERSION=18.17.1
ENV NVM_DIR=/root/.nvm
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
# Golang
ENV PATH="${PATH}:/usr/local/go/bin"
# Protoc
ENV PATH="${PATH}:/usr/local/protoc-3.19.4-linux-x86_64/bin"
# Protobuf go plugin
ENV GO111MODULE=on
ENV PATH="${PATH}:/root/go/bin"

RUN apt-get update && apt-get -y upgrade

RUN apt update \
    && apt install -y --no-install-recommends curl zip wget gcc libc6-dev unzip gpg gnupg2 dirmngr \
    # Install Node
    && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash \
    && . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION} \
    && . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION} \
    && . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION} \
    # Install Golang
    && curl -O https://dl.google.com/go/go1.20.7.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.20.7.linux-amd64.tar.gz \
    && go version \
    # Install Protoc
    && curl -LO https://github.com/protocolbuffers/protobuf/releases/download/v3.19.4/protoc-3.19.4-linux-x86_64.zip \
    && unzip protoc-3.19.4-linux-x86_64.zip -d /usr/local/protoc-3.19.4-linux-x86_64 \
    && chmod +x /usr/local/protoc-3.19.4-linux-x86_64/bin/protoc \
    && protoc --version \
    # Install protobuf go plugin
    && go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.30.0 \
    && go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.3.0 \
    # Install Envoy
    && apt install -y --no-install-recommends debian-keyring debian-archive-keyring apt-transport-https lsb-release \
    && curl -sL 'https://deb.dl.getenvoy.io/public/gpg.8115BA8E629CC074.key' | gpg --dearmor -o /usr/share/keyrings/getenvoy-keyring.gpg \
    && echo a077cb587a1b622e03aa4bf2f3689de14658a9497a9af2c427bba5f4cc3c4723 /usr/share/keyrings/getenvoy-keyring.gpg | sha256sum --check \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/getenvoy-keyring.gpg] https://deb.dl.getenvoy.io/public/deb/debian $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/getenvoy.list \
    && apt update \
    && apt install -y --no-install-recommends getenvoy-envoy \
    && rm -rf /var/lib/apt/lists/* \
    # Install gcloud
    && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" \
    | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list \
    && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg \
    | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add - \
    && apt-get update && apt-get install -y google-cloud-sdk && apt-get clean
