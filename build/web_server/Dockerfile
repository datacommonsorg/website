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

COPY web_app.py /workspace/web_app.py
COPY server/requirements.txt /workspace/server/requirements.txt
# Upgrade pip and setuptools (required by pre-installed pipenv in this base
# image), and remove the base image's standalone wheel, which is unused at
# runtime and not used by PEP 517 isolated package builds.
RUN pip install --no-cache-dir --upgrade pip setuptools \
    && pip uninstall -y wheel
# --no-cache-dir removes ~/.cache files, which can be a few GB.
RUN pip3 install --no-cache-dir -r /workspace/server/requirements.txt

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

# Run as non-root user (UID/GID 10001). Keep /workspace read-only for non-root,
# with a writable /workspace/.cache for standalone runs without Redis.
ENV PYTHONDONTWRITEBYTECODE=1
RUN groupadd -g 10001 appuser && \
    useradd -u 10001 -g appuser -M -d /tmp -s /usr/sbin/nologin appuser && \
    find /workspace ! -type l \( -perm /022 -o ! -perm -444 -o \( -type d ! -perm -111 \) -o \( -perm /111 ! -perm -111 \) \) -exec chmod go-w,a+rX {} + && \
    mkdir -p /workspace/.cache && \
    chown 10001:10001 /workspace/.cache
USER 10001:10001

# 8 workers with 4 threads each allows the app to support up to 32 concurrent requests
# at a time.
CMD exec gunicorn --preload --timeout 1000 --bind :8080 -w 8 --threads 4 web_app:app
