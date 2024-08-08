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

# Installs the runtime dependencies for the gcr.io/datcom-ci/datacommons-services docker.
# The dependencies are as follows (add to this list if and when new dependencies are added):
# - python 3.11
# - envoy
# - nginx

FROM python:3.11.4-slim as runner

RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get -y upgrade \
    && apt update \
    # Install envoy.
    && apt install -y --no-install-recommends curl gpg debian-keyring debian-archive-keyring apt-transport-https lsb-release \
    && curl -sL 'https://deb.dl.getenvoy.io/public/gpg.8115BA8E629CC074.key' | gpg --dearmor -o /usr/share/keyrings/getenvoy-keyring.gpg \
    && echo a077cb587a1b622e03aa4bf2f3689de14658a9497a9af2c427bba5f4cc3c4723 /usr/share/keyrings/getenvoy-keyring.gpg | sha256sum --check \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/getenvoy-keyring.gpg] https://deb.dl.getenvoy.io/public/deb/debian $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/getenvoy.list \
    && apt update \
    && apt install -y --no-install-recommends getenvoy-envoy \
    # Install nginx.
    && apt install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/*