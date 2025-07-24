# Copyright 2025 Google LLC
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

# Start from a Selenium image that has Chrome + ChromeDriver pre-installed
FROM selenium/standalone-chrome:latest

# Install Python + Node.js
USER root

RUN apt-get update && apt-get install -y \
    curl gnupg \
    python3 python3-pip \
    nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Install Percy CLI globally and add to PATH
RUN npm install -g @percy/cli

# Ensure percy is accessible
ENV PATH="/usr/local/bin:$PATH"

# Default working directory
WORKDIR /app

# Copy requirements.txt and install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy the Python script and the URLs file
COPY per_environment_percy_snapshots.py ./
COPY urls.json ./

# Entrypoint override (for Cloud Build)
ENTRYPOINT ["bash"]