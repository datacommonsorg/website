# Copyright 2023 Google LLC
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
  CUSTOM = True
  NAME = "Data Commons"
  OVERRIDE_CSS_PATH = '/custom_dc/custom/overrides.css'
  LOGO_PATH = "/custom_dc/worldbank/logo.svg"
  SHOW_DISASTER = False
  STAT_VAR_HIERARCHY_CONFIG = {
      "nodes": [{
          "dcid": "dc/g/Root"
      }, {
          "dcid": "dc/g/Root",
          "dataSourceDcid": "dc/s/WorldBank",
          "name": "World Bank"
      }]
  }
  DISABLE_BQ = True


class LocalConfig(Config, local.Config):
  pass
