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
from server.routes.admin_panel.constants import DATE_YEAR
from server.routes.admin_panel.constants import NUMBER
from server.routes.admin_panel.constants import OPTIONAL
from server.routes.admin_panel.constants import STRING


class Config(_base.Config):
  CUSTOM = True
  NAME = "Custom Data Commons"
  OVERRIDE_CSS_PATH = '/custom_dc/health/overrides.css'
  LOGO_PATH = "/custom_dc/health/logo.png"
  TEMPLATES_BASE_LOCATION = "custom_dc/health/admin"
  MIN_STAT_VAR_GEO_COVERAGE = 1
  SHOW_DISASTER = False
  USE_LLM = False
  USE_MEMCACHE = False

  # Customizable domain config
  DEFAULT_DOMAIN_CONFIG = {
      'domainName': 'Health Custom Data Commons',
      'logoPresent': False,
      'mainCity': 'Boston, MA',
      'contactEmail': 'contact@example.com',
  }

  ALLOWED_DATA_EXTENSIONS = {
      'csv',
  }
  ALLOWED_LOGO_EXTENSIONS = {
      'png',
  }

  CSV_SCHEMAS = {
      "health_dashboard.csv": {
          "dcid": STRING,
          "year": DATE_YEAR,
          "Percent_Person_WithHealthyVitaminD": NUMBER,
          "Percent_Person_Vaccinated": NUMBER,
          "Percent_Person_Sick": NUMBER,
      }
  }


class LocalConfig(Config, local.Config):
  pass


class ComposeConfig(Config, local.Config):
  pass
