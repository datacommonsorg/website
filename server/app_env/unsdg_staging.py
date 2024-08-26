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
  CUSTOM = True
  GOOGLE_ANALYTICS_TAG_ID = 'G-7QE2ET63E5'
  SHOW_TOPIC = True
  NAME = "Data Commons"
  LOG_QUERY = True
  LOGO_PATH = "/custom_dc/unsdg/logo.png"
  OVERRIDE_CSS_PATH = '/custom_dc/unsdg/overrides.css'
  SHOW_DISASTER = False
  USE_LLM = True
  ENABLE_PER_CAPITA = False
  MAP_TOOL_FOOTER = "The boundaries and names shown and the designations used on this and other maps throughout this publication do not imply official endorsement or acceptance by the United Nations."
  GEO_JSON_PROP = "geoJsonCoordinatesUN"
  CUSTOM_DC_TEMPLATE_FOLDER = "unsdg"
  STAT_VAR_HIERARCHY_CONFIG = {
      "disableSearch":
          True,
      "nodes": [{
          "dcid": "dc/g/SDG"
      }, {
          "dcid": "dc/g/UN"
      }, {
          "dcid": "dc/g/Custom_UN",
          "name": "12 UN Data Thematic Areas (ILO)"
      }]
  }
  DISABLE_BQ = True


class LocalConfig(Config, local.Config):
  pass
