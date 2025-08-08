# Use the official Google Cloud SDK image as a base
FROM google/cloud-sdk:latest

# Install wget and yq
RUN apt-get update && apt-get install -y wget && \
    wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/local/bin/yq && \
    chmod +x /usr/local/bin/yq

# Set the working directory
WORKDIR /workspace

# Copy everything from the current directory to /workspace in the container
COPY . /workspace

# Make all shell scripts executable.
# This is more robust than chmod-ing individual files.
RUN find /workspace/tools /workspace/scripts -type f -name "*.sh" -exec chmod +x {} + && \
    chmod +x /workspace/*.sh