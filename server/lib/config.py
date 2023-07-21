# Copyright 2020 Google LLC
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

import os

import google.auth
from werkzeug.utils import import_string

#
# This is a global config bucket shared by all website instances.
#
GLOBAL_CONFIG_BUCKET = 'datcom-website-config'


def get_config():
  env = os.environ.get('FLASK_ENV')
  prefix = os.environ.get('ENV_PREFIX', '')
  config_class = 'server.app_env.{}.{}Config'.format(env, prefix)
  try:
    cfg = import_string(config_class)()
    cfg.ENV = env
    # USE_LOCAL_MIXER
    if cfg.LOCAL and os.environ.get('USE_LOCAL_MIXER') == 'true':
      cfg.API_ROOT = 'http://127.0.0.1:8081'
    # Set up secret project for GCP deployment
    if not cfg.LOCAL:
      _, project_id = google.auth.default()
      # For webdriver tests and integration test, the SECRET_PROJECT is
      # overwritten to datcom-ci when running on cloudbuild.
      cfg.SECRET_PROJECT = project_id
    return cfg
  except:
    raise ValueError("No valid config class is specified: %s" % config_class)


def is_test_env():
  env = os.environ.get('FLASK_ENV')
  return env in ['integration_test', 'test']