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


# #### Final stage: Runtime env. ####
FROM gcr.io/datcom-ci/datacommons-services-runtime:2024-08-05 as runner

# Env that should not change
ENV USE_LOCAL_MIXER=true \
    ENV_PREFIX=Compose \
    ENABLE_ADMIN=true

RUN rm -rf /workspace

WORKDIR /workspace

# Copy scripts, dependencies and files from the build stages.
COPY --from=mixer /workspace/bin/ bin
COPY --from=mixer /workspace/esp/ esp
COPY --from=mixer /workspace/internal/ internal
COPY --from=mixer /workspace/mixer-grpc.pb .

# Copy executable script.
COPY --chmod=0755 build/cdc_services/run.sh .

RUN echo "Running ls " && echo $(pwd) && ls -l . && echo "Running ls bin" && ls -l bin && echo "Running ls esp" && ls -l esp

# Set the default command to run the script.
CMD ./run.sh