# Copyright 2024 Google LLC
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
"""Functions used for caching nl models and indices"""

import os

# the path in the docker image where nl models and indices will be cached
DOCKER_DATA_FOLDER_PATH = '/workspace/nl_cache'


# Get the root folder path to download files to
def get_cache_root() -> str:
  # When running on docker, use the docker path
  if os.path.exists(DOCKER_DATA_FOLDER_PATH):
    return DOCKER_DATA_FOLDER_PATH
  # otherwise, use tmp folder
  else:
    return '/tmp'
