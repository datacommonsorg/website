#!/bin/bash
set -e

# Run npm install and setup
# The nohup command runs run_npm.sh in a way that it won't be killed when the terminal closes, and & puts it in the background.
nohup ./run_npm.sh >/dev/null 2>&1 &

# Set up environment variables (these should already be set in devcontainer.json, but just in case)
# Load environment variables
if [ -f ".envvars" ]; then
    export $(egrep -v '^#' .envvars | xargs)
fi

# Run the server
./run_server.sh -e one