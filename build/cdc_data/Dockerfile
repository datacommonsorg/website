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

# #### Stage 1: Build env for data importer. ####
FROM python:3.11.4-slim as data-importer

ARG PIP_DISABLE_PIP_VERSION_CHECK=1
ARG PIP_NO_CACHE_DIR=1

WORKDIR /workspace

# Copy requirements.
COPY import/simple/requirements.txt ./import/simple/requirements.txt

# Create a virtual env and install requirements.
RUN python -m venv /workspace/venv
ENV PATH="/workspace/venv/bin:$PATH"
RUN pip3 install -r ./import/simple/requirements.txt

# Copy simple importer.
COPY import/simple/ ./import/simple/


# #### Stage 2: Build env for embeddings builder. ####
FROM python:3.11.4-slim as embeddings-builder

ARG PIP_DISABLE_PIP_VERSION_CHECK=1
ARG PIP_NO_CACHE_DIR=1

WORKDIR /workspace

# Copy requirements.
# Copy nl_requirements.txt since it is referenced by embeddings requirements.txt
COPY tools/nl/embeddings/requirements.txt ./tools/nl/embeddings/requirements.txt
COPY nl_requirements.txt ./nl_requirements.txt

# Create a virtual env and install requirements.
# Remove lancedb - it is not used by custom dc.
RUN python -m venv ./venv
ENV PATH="/workspace/venv/bin:$PATH"
RUN sed -i'' '/lancedb/d' /workspace/nl_requirements.txt \
    && pip3 install torch==2.2.2 --extra-index-url https://download.pytorch.org/whl/cpu \
    && pip3 install -r ./tools/nl/embeddings/requirements.txt

# Copy the embeddings builder module.
COPY tools/nl/embeddings/. ./tools/nl/embeddings/
# Copy the shared module.
COPY shared/. ./shared/
# Copy nl_server module. Some scripts from here are used by the embeddings builder.
COPY nl_server/. /workspace/nl_server/
# Copy yaml files used by the embeddings builder.
COPY deploy/nl/. /datacommons/nl/


# #### Stage 3: Download base dc model from GCS. ####
FROM google/cloud-sdk:slim as model-downloader

# Copy model.
RUN mkdir -p /tmp/datcom-nl-models \
    && gsutil -m cp -R gs://datcom-nl-models/ft_final_v20230717230459.all-MiniLM-L6-v2/ /tmp/datcom-nl-models/


# #### Stage 4: Runtime env. ####
FROM python:3.11.4-slim as runner

ARG ENV
ENV ENV=${ENV}

WORKDIR /workspace

# Copy scripts, dependencies and files from the build stages.
COPY --from=data-importer /workspace/ .
COPY --from=embeddings-builder /workspace/ .
COPY --from=embeddings-builder /datacommons/ /datacommons
COPY --from=model-downloader /tmp/datcom-nl-models /tmp/datcom-nl-models

# Copy executable script.
COPY build/cdc_data/run.sh .

# Make script executable.
RUN chmod +x run.sh

# Add virtual env to the path.
ENV PATH="/workspace/venv/bin:$PATH"

# Set the default command to run the script.
CMD ./run.sh