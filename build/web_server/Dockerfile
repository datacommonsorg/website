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


FROM nikolaik/python-nodejs:python3.11-nodejs18-slim as base

RUN apt-get update && apt-get -y upgrade && apt-get install -y git

ARG ENV
ENV ENV=${ENV}

WORKDIR /workspace

COPY --from=ghcr.io/astral-sh/uv:0.9.18 /uv /uvx /bin/
ENV VIRTUAL_ENV=/workspace/venv
ENV UV_PROJECT_ENVIRONMENT=/workspace/venv
ENV PATH="/workspace/venv/bin:$PATH"

COPY web_app.py /workspace/web_app.py
COPY server/pyproject.toml server/uv.lock /workspace/server/
# --no-cache avoids storing uv cache files in the image layer.
RUN uv sync --project /workspace/server --locked --no-dev --no-cache

COPY packages/web-components/package.json /workspace/packages/web-components/package.json
COPY packages/web-components/package-lock.json /workspace/packages/web-components/package-lock.json
RUN npm --prefix /workspace/packages/web-components install --omit=dev

COPY packages/client/package.json /workspace/packages/client/package.json
COPY packages/client/package-lock.json /workspace/packages/client/package-lock.json
RUN npm --prefix /workspace/packages/client install

COPY static/package.json /workspace/static/package.json
COPY static/package-lock.json /workspace/static/package-lock.json
RUN npm --prefix /workspace/static install --omit=dev

# NPM
COPY packages/. /workspace/packages/
COPY static/. /workspace/static/
WORKDIR /workspace/static
RUN npm run-script build

# Flask
COPY server/. /workspace/server/
COPY shared/. /workspace/shared/
WORKDIR /workspace
# 8 workers with 4 threads each allows the app to support up to 32 concurrent requests
# at a time.
CMD exec gunicorn --preload --timeout 1000 --bind :8080 -w 8 --threads 4 web_app:app
