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

FROM python:3.12-slim-bookworm

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install git and nodejs/npm
RUN apt-get update && apt-get install -y \
  git \
  nodejs \
  npm \
  && rm -rf /var/lib/apt/lists/*

ARG ENV
ENV ENV=${ENV}

WORKDIR /workspace

COPY web_app.py /workspace/web_app.py
COPY server/pyproject.toml /workspace/server/pyproject.toml
COPY server/uv.lock /workspace/server/uv.lock

# Install dependencies
WORKDIR /workspace/server
RUN uv sync --frozen --project .

WORKDIR /workspace

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

# The number of workers (8) is the number of requests that the app can support
# at a time.
CMD exec uv run --project server gunicorn --preload --timeout 1000 --bind :8080 -w 8 web_app:app
