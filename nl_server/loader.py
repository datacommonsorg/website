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

import os
from typing import Any, Dict

import yaml

from nl_server import config
from nl_server import embeddings_store
from nl_server.nl_attribute_model import NLAttributeModel

_MODEL_YAML = 'models.yaml'
_EMBEDDINGS_YAML = 'embeddings.yaml'
_CUSTOM_EMBEDDINGS_YAML = 'custom_embeddings.yaml'

NL_CACHE_PATH = '~/.datacommons/'
NL_EMBEDDINGS_CACHE_KEY = 'nl_embeddings'
NL_MODEL_CACHE_KEY = 'nl_model'
_NL_CACHE_EXPIRE = 3600 * 24  # Cache for 1 day
_NL_CACHE_SIZE_LIMIT = 16e9  # 16Gb local cache size


#
# Reads the yaml files and loads all the server state.
#
def load_server_state(app: Any):
  flask_env = os.environ.get('FLASK_ENV')

  embeddings_map, models_map = _load_yamls(flask_env)

  # In local dev, cache the embeddings on disk so each hot reload won't download
  # the embeddings again.
  if _use_cache(flask_env):
    from diskcache import Cache
    cache = Cache(NL_CACHE_PATH, size_limit=_NL_CACHE_SIZE_LIMIT)
    cache.expire()

    nl_model = cache.get(NL_MODEL_CACHE_KEY)
    nl_embeddings = cache.get(NL_EMBEDDINGS_CACHE_KEY)
    if nl_model and nl_embeddings:
      app.config[config.NL_MODEL_KEY] = nl_model
      app.config[config.NL_EMBEDDINGS_KEY] = nl_embeddings
      app.config[config.NL_EMBEDDINGS_VERSION_KEY] = embeddings_map
      return

  nl_embeddings = embeddings_store.Store(config.load(embeddings_map,
                                                     models_map))
  nl_model = NLAttributeModel()
  app.config[config.NL_MODEL_KEY] = nl_model
  app.config[config.NL_EMBEDDINGS_KEY] = nl_embeddings
  app.config[config.NL_EMBEDDINGS_VERSION_KEY] = embeddings_map

  if _use_cache(flask_env):
    with Cache(cache.directory, size_limit=_NL_CACHE_SIZE_LIMIT) as reference:
      reference.set(NL_EMBEDDINGS_CACHE_KEY,
                    nl_embeddings,
                    expire=_NL_CACHE_EXPIRE)
      reference.set(NL_MODEL_CACHE_KEY, nl_model, expire=_NL_CACHE_EXPIRE)


def _load_yamls(flask_env: str) -> tuple[Dict[str, str], Dict[str, str]]:
  with open(get_env_path(flask_env, _MODEL_YAML)) as f:
    models_map = yaml.full_load(f)
  assert models_map, 'No models.yaml found!'

  with open(get_env_path(flask_env, _EMBEDDINGS_YAML)) as f:
    embeddings_map = yaml.full_load(f)
  assert embeddings_map, 'No embeddings.yaml found!'

  custom_map = _maybe_load_custom_dc_yaml()
  if custom_map:
    embeddings_map.update(custom_map)

  return embeddings_map, models_map


def _maybe_load_custom_dc_yaml():
  base = os.environ.get('SQL_DATA_PATH')
  if not base:
    return None

  file_path = os.path.join(base, f'data/nl/{_CUSTOM_EMBEDDINGS_YAML}')
  if os.path.exists(file_path):
    with open(file_path) as f:
      return yaml.full_load(f)

  return None


#
# On prod the yaml files are in /datacommons/nl/, whereas
# in test-like environments it is the checked in path
# (deploy/nl/).
#
def get_env_path(flask_env: str, file_name: str) -> str:
  if flask_env in ['local', 'test', 'integration_test', 'webdriver']:
    return os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        f'deploy/nl/{file_name}')

  return f'/datacommons/nl/{file_name}'


def _use_cache(flask_env):
  return flask_env in ['local', 'integration_test', 'webdriver']