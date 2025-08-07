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


# #### Stage 1: Download base dc model from GCS. ####
FROM google/cloud-sdk:slim AS model-downloader

# Copy model.
RUN mkdir -p /tmp/datcom-nl-models \
    && gsutil -m cp -R gs://datcom-nl-models/ft_final_v20230717230459.all-MiniLM-L6-v2/ /tmp/datcom-nl-models/


# #### Stage 2: Python runtime. ####
FROM python:3.11.4-slim AS runner

ARG ENV
ENV ENV=${ENV}

WORKDIR /workspace

# Copy models
COPY --from=model-downloader /tmp/datcom-nl-models /tmp/datcom-nl-models

# Copy simple importer requirements.
COPY import/simple/requirements.txt ./import/simple/requirements.txt

# Copy embeddings builder requirements.
# Copy nl_requirements.txt since it is referenced by embeddings requirements.txt
COPY tools/nl/embeddings/requirements.txt ./tools/nl/embeddings/requirements.txt
COPY nl_requirements.txt ./nl_requirements.txt

ARG PIP_DISABLE_PIP_VERSION_CHECK=1
ARG PIP_NO_CACHE_DIR=1

# Create a virtual env, add it to path, and install all requirements.
RUN python -m venv /workspace/venv
ENV PATH="/workspace/venv/bin:$PATH"

# TODO: Install requirements for embeddings importer and data importer in separate virtual envs.
# Install embeddings importer requirements.
RUN pip3 install -r ./import/simple/requirements.txt

# Install data requirements.
RUN pip3 install torch==2.2.2 --extra-index-url https://download.pytorch.org/whl/cpu \
    && pip3 install -r ./tools/nl/embeddings/requirements.txt

# Copy the embeddings builder module.
COPY tools/nl/embeddings/. ./tools/nl/embeddings/
# Copy the shared module.
COPY shared/. ./shared/
# Copy nl_server module. Some scripts from here are used by the embeddings builder.
COPY nl_server/. /workspace/nl_server/
# Copy yaml files used by the embeddings builder.
COPY deploy/nl/. /datacommons/nl/
# Copy simple importer.
COPY import/simple/ ./import/simple/

# Copy executable script.
COPY build/cdc_data/run.sh .

# Make script executable.
RUN chmod +x run.sh

# Activate the virtual env.
ENV PATH="/workspace/venv/bin:$PATH"

# Set the default command to run the script.
CMD ["./run.sh"]