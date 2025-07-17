# Start from a Selenium image that has Chrome + ChromeDriver pre-installed
FROM selenium/standalone-chrome:latest

# Install Python + Node.js
USER root

RUN apt-get update && apt-get install -y \
    curl gnupg \
    python3 python3-pip \
    nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip3 install --no-cache-dir selenium percy-selenium

# Install Percy CLI globally and add to PATH
RUN npm install -g @percy/cli

# Ensure percy is accessible
ENV PATH="/usr/local/bin:$PATH"

# Default working directory
WORKDIR /app

COPY per_environment_percy_snapshots.py ./

# Entrypoint override (for Cloud Build)
ENTRYPOINT ["bash"]
