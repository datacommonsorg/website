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
  # Whether to have account management page
  ADMIN = False
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

  # Environment name of the config.
  ENV = ''
  # Name of the site. The name is changed for custom instance.
  NAME = 'Data Commons'
  VERSION = '{}-{}'.format(os.environ.get('WEBSITE_HASH'),
                           os.environ.get('MIXER_HASH'))
  API_ROOT = 'http://127.0.0.1:8081'  # Port for Kubernetes ESP.
  NL_ROOT = 'http://127.0.0.1:6060'  # Port for Kubernetes ESP.
  SECRET_PROJECT = ''
  GA_ACCOUNT = ''
  SCHEME = 'https'
  # Additional stat vars that need to be fetched for place page data.
  # This is only needed for local development when cache is not up to date.
  NEW_STAT_VARS = []
  # If set, will be used in the main header of the default base template. Must
  # be the full serving path from /static folder.
  LOGO_PATH = ''
  # If set, will be included on all pages, after base DC css as verbatim
  # overrides in the default base template. Will not be compiled. Must be the
  # full serving path from /static folder.
  OVERRIDE_CSS_PATH = ''
