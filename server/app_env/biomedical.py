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

from server.app_env import _base
from server.app_env import local


class Config(_base.Config):
  API_ROOT = 'https://autopush.api.datacommons.org'
  GCS_BUCKET = 'datcom-website-autopush-resources'
  HIDE_DEBUG = False
  LOG_QUERY = True
  OVERRIDE_CSS_PATH = "/css/biomedical_landing.min.css"
  SHOW_TOPIC = True
  USE_LLM = True
  USE_MEMCACHE = False


class LocalConfig(local.Config):
  API_ROOT = 'https://autopush.api.datacommons.org'
  OVERRIDE_CSS_PATH = "/css/biomedical_landing.min.css"
  SECRET_PROJECT = 'datcom-biomedical'
