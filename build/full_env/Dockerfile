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


# Stage 1: Python Builder
# Uses a specific Python patch version on a slim Debian Bookworm base
FROM python:3.11.4-slim-bookworm as python-builder

# Stage 2: Node.js Builder
# Uses a specific Node.js patch version. Note: This specific patch version's slim image
# might be based on Debian Bullseye, not Bookworm, leading to a slight mix of Debian releases.
# If strict Bookworm consistency is preferred over exact patch version, consider 'node:18-slim-bookworm'.
FROM node:18.4.0-slim as node-builder

# Stage 3: Go Builder
# Uses a specific Go patch version on a Debian Bookworm base
FROM golang:1.20.7-bookworm as go-builder

# Stage 4: Protoc Builder
# Downloads and extracts protoc, as there isn't a dedicated "protoc" base image for easy copying.
FROM debian:bookworm-slim as protoc-builder
ENV PROTOC_VERSION="21.12"
RUN apt update && \
    # Explicitly install ca-certificates along with curl and unzip for this stage's curl
    apt install -y --no-install-recommends curl unzip ca-certificates && \
    curl -LO "https://github.com/protocolbuffers/protobuf/releases/download/v${PROTOC_VERSION}/protoc-${PROTOC_VERSION}-linux-x86_64.zip" && \
    unzip protoc-${PROTOC_VERSION}-linux-x86_64.zip -d /usr/local && \
    rm protoc-${PROTOC_VERSION}-linux-x86_64.zip && \
    # Clean up after download and extraction
    apt autoremove -y curl unzip ca-certificates && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*

# Stage 5: Envoy Builder
# Uses the official Envoy proxy image for the specified version to get the Envoy binary
FROM envoyproxy/envoy:v1.31.0 as envoy-builder

# Stage 6: Google Cloud SDK Builder
FROM google/cloud-sdk:469.0.0-slim as gcloud-builder

# Final Stage: Combine all components + Chrome/ChromeDriver
# Using debian:bookworm-slim as a minimal base for the final image.
FROM debian:bookworm-slim

# Install common utilities needed for the combined environment,
# including build-essential for some tools, and tools for Chrome/ChromeDriver.
RUN apt update && apt install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    build-essential \
    gnupg \
    wget \
    unzip \
    && \
    apt autoremove -y && \
    apt clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Set WORKDIR for potential later commands (optional here, but following your example)
WORKDIR /resources

# --- Install Google Chrome ---
# Use the modern, secure way to add the GPG key and APT repository
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/keyrings/google-chrome.gpg && \
    echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt update && \
    apt install -y google-chrome-stable

# Install default fonts needed by Chrome/applications
RUN apt install -y fonts-indic fonts-noto fonts-noto-cjk

# --- Install ChromeDriver ---
# Note: This method fetches the latest stable ChromeDriver compatible with the latest stable Chrome.
# To use a specific version, replace the curl URL with the direct URL for that version.
RUN CHROME_DRIVER_VERSION=$(curl -sS https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_STABLE) && \
    wget -O /tmp/chromedriver.zip https://storage.googleapis.com/chrome-for-testing-public/${CHROME_DRIVER_VERSION}/linux64/chromedriver-linux64.zip && \
    unzip /tmp/chromedriver.zip -d /tmp/ && \
    cp /tmp/chromedriver-linux64/chromedriver /usr/bin/ && \
    chown root:root /usr/bin/chromedriver && \
    chmod +x /usr/bin/chromedriver

# Copy Python runtime
COPY --from=python-builder /usr/local /usr/local

# Copy Node.js runtime
COPY --from=node-builder /usr/local/bin /usr/local/bin
COPY --from=node-builder /usr/local/lib/node_modules /usr/local/lib/node_modules

# Copy Go installation
COPY --from=go-builder /usr/local/go /usr/local/go

# Copy Protoc binary and include files
COPY --from=protoc-builder /usr/local/bin/protoc /usr/local/bin/protoc
COPY --from=protoc-builder /usr/local/include/google /usr/local/include/google

# Copy Envoy binary
COPY --from=envoy-builder /usr/local/bin/envoy /usr/local/bin/envoy

# Copy Google Cloud SDK
COPY --from=gcloud-builder /usr/lib/google-cloud-sdk /usr/lib/google-cloud-sdk

# Set PATH to include all binaries
# --- IMPORTANT: Configure GOPATH and install Go Protobuf plugins ---
ENV GOPATH="/go"
ENV PATH="/usr/local/go/bin:${GOPATH}/bin:/usr/local/bin:/usr/lib/google-cloud-sdk/bin:${PATH}"

# Create GOPATH directories and install Go Protobuf plugins
# This must happen AFTER Go is installed and its PATH is set up
RUN mkdir -p ${GOPATH}/src ${GOPATH}/bin && \
    go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.30.0 && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.3.0
