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


FROM gcr.io/datcom-ci/python-node-go-protoc-envoy-gcloud:2024-06-08

ARG ENV
ARG PIP_DISABLE_PIP_VERSION_CHECK=1
ARG PIP_NO_CACHE_DIR=1
ENV ENV=${ENV}

WORKDIR /workspace

RUN apt install -y nginx

# Docker cache: Download modules
COPY mixer/go.mod mixer/go.sum ./
RUN go mod download -x

# Copy files
COPY mixer/proto/ proto
COPY mixer/internal/ internal

# Build protobuf
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

# Adding the grpc_health_probe
RUN GRPC_HEALTH_PROBE_VERSION=v0.4.7 && \
  wget -qO/bin/grpc_health_probe https://github.com/grpc-ecosystem/grpc-health-probe/releases/download/${GRPC_HEALTH_PROBE_VERSION}/grpc_health_probe-linux-amd64 && \
  chmod +x /bin/grpc_health_probe

# Build binary
COPY mixer/cmd/ cmd
COPY mixer/esp/ esp
ENV CGO_ENABLED=1
RUN go build -o /go/bin/mixer cmd/main.go

# Website Server
COPY web_app.py /workspace/web_app.py
COPY server/requirements.txt /workspace/server/requirements.txt
RUN pip install --upgrade pip
RUN pip install --upgrade setuptools
RUN pip3 install --no-cache-dir -r /workspace/server/requirements.txt

# NL Server
COPY nl_app.py /workspace/nl_app.py
COPY deploy/nl/. /datacommons/nl/
COPY nl_server/requirements.txt /workspace/nl_server/requirements.txt
COPY nl_requirements.txt /workspace/nl_requirements.txt
# TODO: Undo this once we figure out why lancedb breaks Custom DC Docker
RUN sed -i'' '/lancedb/d' /workspace/nl_server/requirements.txt
RUN pip install --upgrade pip
RUN pip3 install torch==2.2.2 --extra-index-url https://download.pytorch.org/whl/cpu
RUN pip3 install --no-cache-dir -r /workspace/nl_server/requirements.txt

# Import Tool
COPY import/simple/requirements.txt /workspace/import/simple/requirements.txt
RUN pip3 install --no-cache-dir -r /workspace/import/simple/requirements.txt

# Embeddings Tool
COPY tools/nl/embeddings/requirements.txt /workspace/tools/nl/embeddings/requirements.txt
RUN pip3 install -r /workspace/tools/nl/embeddings/requirements.txt

# Install website NPM dependencies
COPY packages/web-components/package.json /workspace/packages/web-components/package.json
COPY packages/web-components/package-lock.json /workspace/packages/web-components/package-lock.json
RUN npm --prefix /workspace/packages/web-components install --omit=dev

COPY packages/client/package.json /workspace/packages/client/package.json
COPY packages/client/package-lock.json /workspace/packages/client/package-lock.json
RUN npm --prefix /workspace/packages/client install

COPY static/package.json /workspace/static/package.json
COPY static/package-lock.json /workspace/static/package-lock.json
RUN npm --prefix /workspace/static install --omit=dev

# Install packages NPM depenencies
COPY packages/. /workspace/packages/
COPY static/. /workspace/static/

# Build Static Files
WORKDIR /workspace/static
RUN npm run-script build

WORKDIR /workspace

# Flask
COPY server/. /workspace/server/
COPY shared/. /workspace/shared/

# NL Server
COPY nl_server/. /workspace/nl_server/
COPY deploy/nl/catalog.yaml /datacommons/nl/catalog.yaml

# Import Tool
COPY import/. /workspace/import/

# Embeddings Tool
COPY tools/nl/embeddings/. /workspace/tools/nl/embeddings/

# Download model and embeddings
RUN mkdir -p /tmp/datcom-nl-models
RUN gsutil cp -R gs://datcom-nl-models/ft_final_v20230717230459.all-MiniLM-L6-v2/ /tmp/datcom-nl-models/

WORKDIR /workspace

# Env that should not change
ENV USE_LOCAL_MIXER=true
ENV ENV_PREFIX=Compose
ENV ENABLE_ADMIN=true


# Env that can be set from `docker run`
ENV DEBUG=false
ENV USE_SQLITE=false
ENV USE_CLOUDSQL=false
ENV DC_API_ROOT=https://api.datacommons.org
ENV ENABLE_MODEL=false

COPY build/web_compose/compose.sh .
COPY build/web_compose/nginx.conf .
EXPOSE 8080
CMD ./compose.sh
