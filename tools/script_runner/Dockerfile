# Use the official Google Cloud SDK image as a base
FROM google/cloud-sdk:latest

# Install wget and yq
RUN apt-get update && apt-get install -y wget && \
    wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/local/bin/yq && \
    chmod +x /usr/local/bin/yq

# Set the working directory
WORKDIR /workspace

# Copy the tools and scripts directories
COPY tools/ /workspace/tools/
COPY scripts/ /workspace/scripts/

# Copy top-level scripts
COPY run_cdc_dev_docker.sh /workspace/
COPY run_cdc_dev.sh /workspace/
COPY run_cdc_tests.sh /workspace/
COPY run_experimental.sh /workspace/
COPY run_nl_server.sh /workspace/
COPY run_npm.sh /workspace/
COPY run_sdg_sanity.sh /workspace/
COPY run_server.sh /workspace/
COPY run_servers.sh /workspace/
COPY run_test.sh /workspace/
COPY run_website_adversarial.sh /workspace/
COPY run_website_sanity.sh /workspace/
COPY run_website_screenshot.sh /workspace/

# Make all shell scripts executable.
# This is more robust than chmod-ing individual files.
RUN find /workspace/tools /workspace/scripts -type f -name "*.sh" -exec chmod +x {} + && \
    chmod +x /workspace/*.sh