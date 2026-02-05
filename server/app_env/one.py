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

from server.app_env import _base
from server.app_env import local


class Config(_base.Config):
  GOOGLE_ANALYTICS_TAG_ID = 'GTM-W6DJJVL'
  CUSTOM = True
  NAME = "ONE Data Commons"
  OVERRIDE_CSS_PATH = '/custom_dc/one/overrides.css'
  SHOW_DISASTER = False
  USE_MEMCACHE = True
  MIN_STAT_VAR_GEO_COVERAGE = 1
  APP_VARS = {"PRIMARY_SITE_WEB_ROOT": "https://data.one.org"}
  TOPIC_PAGE_CONFIGS = {
      'economy': ['africa'],
      'health': ['africa'],
      'people': ['africa']
  }


class LocalConfig(Config, local.Config):
  USE_MEMCACHE = False
  APP_VARS = {"PRIMARY_SITE_WEB_ROOT": "http://localhost:3000"}


class ComposeConfig(Config, local.Config):
  pass