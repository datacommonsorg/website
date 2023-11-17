#!/bin/bash
set -e

# Default environment
ENVIRONMENT="custom"

# Check for -e argument and assign it to ENVIRONMENT
while getopts "e:" opt; do
  case $opt in
    e) ENVIRONMENT="$OPTARG"
    ;;
    \?) echo "Invalid option -$OPTARG" >&2
    ;;
  esac
done

# Run npm install and setup
# The nohup command runs run_npm.sh in a way that it won't be killed when the terminal closes, and & puts it in the background.
nohup ./run_npm.sh >/dev/null 2>&1 &

# Build themes...
# Navigate to the themes directory
cd static/themes

# Install npm dependencies and run the watch script
npm install
npm run watch &

# Navigate back to the original directory
cd -

# Set up environment variables (these should already be set in devcontainer.json, but just in case)
# Load environment variables
if [ -f ".envvars" ]; then
    export $(egrep -v '^#' .envvars | xargs)
fi

# Run the server
./run_server.sh -e "$ENVIRONMENT"