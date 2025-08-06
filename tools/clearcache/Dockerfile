# Use the official Google Cloud SDK image as a base
FROM google/cloud-sdk:latest

# Install wget and yq
RUN apt-get update && apt-get install -y wget && \
    wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/local/bin/yq && \
    chmod +x /usr/local/bin/yq

# Set the working directory
WORKDIR /workspace

# Copy the entire website directory into the image
COPY . /workspace

# Make the run.sh script executable
RUN chmod +x /workspace/tools/clearcache/run.sh
RUN chmod +x /workspace/scripts/deploy_cloud_esp.sh