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

ARG ENV
ENV ENV=${ENV}

WORKDIR /workspace

COPY nl_app.py /workspace/nl_app.py
COPY nl_server/requirements.txt /workspace/nl_server/requirements.txt
# --no-cache-dir removes ~/.cache files, which can be a few GB.
RUN pip install --upgrade pip setuptools light-the-torch
RUN ltt install torch --cpuonly
RUN pip3 install --no-cache-dir \
    -r /workspace/nl_server/requirements.txt
# Flask
COPY nl_server/. /workspace/nl_server/
COPY shared/. /workspace/shared/

# Run server
WORKDIR /workspace
CMD exec gunicorn --timeout 60 --bind :6060 nl_app:app