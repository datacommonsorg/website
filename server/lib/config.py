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

from werkzeug.utils import import_string

ENV = {
    # Production
    'production',
    'prod-sustainability',
    # Staging
    'staging',
    'staging-sustainability',
    # Autopush
    'autopush',
    'autopush-sustainability',
    # Private
    'private',
    'feeding-america',
    'tidal',
    # Dev
    'dev',
    # Test
    'test',
    'test-sustainability',
    # Webdriver
    'webdriver',
    # Minikube
    'minikube',
    # Local
    'local',
    'local-lite',
    'local-private',
    'local-sustainability',
}


def map_config_string(env):
    index = env.find('-')
    env_list = list(env)
    env_list[index + 1] = env[index + 1].upper()
    env_list[0] = env[0].upper()
    env_updated = "".join(env_list).replace('-', '')
    return 'configmodule.{}Config'.format(env_updated)


def get_config():
    env = os.environ.get('FLASK_ENV')
    if env in ENV:
        return import_string(map_config_string(env))()
    raise ValueError("No valid FLASK_ENV is specified: %s" % env)
