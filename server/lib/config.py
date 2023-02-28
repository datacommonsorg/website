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

import logging
import os

from werkzeug.utils import import_string


def get_config():
  env = os.environ.get('FLASK_ENV')
  prefix = os.environ.get('ENV_PREFIX', '')
  config_class = 'server.app_env.{}.{}Config'.format(env, prefix)
  try:
    cfg = import_string(config_class)()
    cfg.ENV = env
    return cfg
  except:
    raise ValueError("No valid config class is specified: %s" % config_class)
