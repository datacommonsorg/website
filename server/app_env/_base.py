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

# Module to hold Flask environment configuration base class.
# All the flags used in the environmnet should be defined here with default
# value.

import os


class Config:
  TEST = False
  INTEGRATION = False
  WEBDRIVER = False
  LOCAL = False
  LITE = False
  # If the deployment is a custom instance.
  CUSTOM = False
  # Set this to False if the deployment has frequently updated data.
  USE_MEMCACHE = True
  # Whether to log the query (and make them avaiable in query history interface)
  # Eanbling this to "True" requires adding "bigtable/user" acccess for the
  # service account in datcom-store IAM settings
  LOG_QUERY = False
  # Whether to show topic page
  SHOW_TOPIC = False
  # Whether to show disaster page
  SHOW_DISASTER = True
  # Whether to show sustainability page
  SHOW_SUSTAINABILITY = False
  # Whether to use GenAI API
  USE_LLM = False
  # Show per capita option in chart
  ENABLE_PER_CAPITA = True

  # Environment name of the config.
  ENV = ''
  # Name of the site. The name is changed for custom instance.
  NAME = 'Data Commons'
  VERSION = '{}-{}'.format(os.environ.get('WEBSITE_HASH'),
                           os.environ.get('MIXER_HASH'))
  API_ROOT = 'http://127.0.0.1:8081'  # Port for Kubernetes ESP.
  SECRET_PROJECT = ''
  GA_ACCOUNT = ''
  SCHEME = 'https'
  # Additional stat vars that need to be fetched for place page data.
  # This is only needed for local development when cache is not up to date.
  NEW_STAT_VARS = []
  # If set, will be used in the main header of the default base template. Must
  # be the full serving path from /static folder.
  LOGO_PATH = '/images/dc-logo.svg'
  # If set, will be included on all pages, after base DC css as verbatim
  # overrides in the default base template. Will not be compiled. Must be the
  # full serving path from /static folder.
  OVERRIDE_CSS_PATH = ''
  # The dcid of the special data source to show as top level category in the hierarchy
  DATA_SOURCE_DCID = ''
  # The name of the special data source to show as top level category in the hierarchy
  DATA_SOURCE_NAME = ''
  # Should hide debug info
  HIDE_DEBUG = True
  # Footer note to show in the map tool
  MAP_TOOL_FOOTER = ""
  # The default property to use for getting geojsons
  GEO_JSON_PROP = "geoJsonCoordinates"
  # Optional: Override the stat var hierarchy root nodes with these filters.
  # Example: Set to "dc/g/SDG" to only show SDG variables.
  # Typedef in static/js/tools/stat_var/stat_var_hierarchy_config.ts
  STAT_VAR_HIERARCHY_CONFIG = {"nodes": [{"dcid": "dc/g/Root"}]}
  # Optional: custom dc template folder name:
  # /server/templates/custom_dc/<CUSTOM_DC_TEMPLATE_FOLDER>/
  # Defaults to the custom DC application environment name (Config.ENV value)
  CUSTOM_DC_TEMPLATE_FOLDER = ''
  # Optional: Minimum number of entities a stat var needs to have data for it to
  # be included in the map and scatter plot tools. Setting a value of 1 shows
  # all stat vars available for a given entity. Setting a value > 1 prevents
  # users from encountering almost-empty maps and sparse scatter plots.
  MIN_STAT_VAR_GEO_COVERAGE = 10
  # NL Bad words file.
  BAD_WORDS_FILE = 'nl_bad_words.txt'
  # Whether to disable BigQuery from instance. This is primarily used for
  # accessing the observation browser pages.
  DISABLE_BQ = False
