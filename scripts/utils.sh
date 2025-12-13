#!/bin/bash

# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Utility functions used by our scripts


# ----------------------------------
# Configuration & Color Detection
# ----------------------------------

# We use color formatting only if:
# 1. [-t 1]  -> STDOUT is a terminal (not a file or CI pipe)
# 2. [-z "${NO_COLOR}"] -> The user hasn't explicitly disabled color (standard practice)
# To disable color formatting, set NO_COLOR=1 as an environment variable.
if [ -t 1 ] && [ -z "${NO_COLOR}" ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color, which is used to reset color formatting
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# ----------------------------------
# Logging Functions
# ----------------------------------

log_notice() {
    echo -e "${BLUE}[NOTICE]${NC}  $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC}  $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC}  $1"
}

# Errors sent to STDERR so they don't corrupt pipes if you pipe your script output
log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# ----------------------------------
# uv Detection
# ----------------------------------

# Assert that uv is installed. If not, exit with an error.
assert_uv() {
    if ! command -v uv &> /dev/null; then
    log_error "Error: uv could not be found. Please install it and try again."
    exit 1
    fi
}
