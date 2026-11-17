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

FROM python:3.11.4-slim

RUN apt-get update && apt-get -y upgrade

ARG ENV
ENV ENV=${ENV}

WORKDIR /workspace

COPY --from=ghcr.io/astral-sh/uv:0.9.18 /uv /uvx /bin/
ENV VIRTUAL_ENV=/workspace/venv
ENV UV_PROJECT_ENVIRONMENT=/workspace/venv
ENV PATH="/workspace/venv/bin:$PATH"

COPY nl_app.py /workspace/nl_app.py
COPY nl_server/pyproject.toml nl_server/uv.lock /workspace/nl_server/
# --no-cache avoids storing uv cache files in the image layer.
RUN uv sync --project /workspace/nl_server --locked --no-dev --no-cache
# Flask
COPY nl_server/. /workspace/nl_server/
COPY shared/. /workspace/shared/

# Download nl files from gcs
COPY deploy/helm_charts/dc_website/nl/catalog.yaml .
COPY tools/nl/download_nl_files/requirements.txt /workspace/download_nl_files/requirements.txt
COPY tools/nl/download_nl_files/download_nl_files.py .
RUN uv pip install --no-cache -r /workspace/download_nl_files/requirements.txt
RUN python3 download_nl_files.py --is_docker_mode=True

# Run server
WORKDIR /workspace
# Use a large timeout because when there are more workers, NL server will take
# longer to start
CMD exec gunicorn --timeout 1000 --bind :6060 -w $((NUM_WORKERS + 0)) nl_app:app