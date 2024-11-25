#!/bin/bash
# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Make a label for container images using the combined commit hash of website
# and its submods.

# Optionally use the commit before HEAD for the main repo.
if [[ "$1" == "--head-is-temporary" ]]; then
  website_rev="$(git rev-parse --short HEAD~1)"
else
  website_rev="$(git rev-parse --short HEAD)"
fi
mixer_rev="$(git rev-parse --short HEAD:mixer)"
import_rev="$(git rev-parse --short HEAD:import)"
image_label="${website_rev}-${mixer_rev}-${import_rev}"

echo "$image_label"
