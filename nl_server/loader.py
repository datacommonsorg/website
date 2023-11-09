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

import logging
import os
from typing import Any, Dict

from diskcache import Cache
from flask import Flask
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
def load_server_state(app: Flask):
  flask_env = os.environ.get('FLASK_ENV')

  embeddings_map, models_map = _load_yamls(flask_env)

  # In local dev, cache the embeddings on disk so each hot reload won't download
  # the embeddings again.
  if _use_cache(flask_env):
    cache = Cache(NL_CACHE_PATH, size_limit=_NL_CACHE_SIZE_LIMIT)
    cache.expire()

    nl_model = cache.get(NL_MODEL_CACHE_KEY)
    nl_embeddings = cache.get(NL_EMBEDDINGS_CACHE_KEY)
    if nl_model and nl_embeddings:
      _update_app_config(app, nl_model, nl_embeddings, embeddings_map)
      return

  nl_embeddings = embeddings_store.Store(config.load(embeddings_map,
                                                     models_map))
  nl_model = NLAttributeModel()
  _update_app_config(app, nl_model, nl_embeddings, embeddings_map)

  _maybe_cache(flask_env, nl_embeddings, nl_model)


def load_custom_embeddings(app: Flask):
  """Loads custom DC embeddings at runtime.

  This method should only be called at runtime (i.e. NOT at startup).
  It assumes that embeddings were already initialized at startup and this method
  only merges any newly loaded custom embeddings with the default embeddings.

  NOTE that this method requires that the custom embeddings be available 
  on a local path.
  """
  flask_env = os.environ.get('FLASK_ENV')
  embeddings_map, _ = _load_yamls(flask_env)
  # TODO: call config._parse() to parse embeddings and assert that the path is local.
  custom_embeddings_local_path = embeddings_map.get(config.CUSTOM_DC_INDEX)
  if not custom_embeddings_local_path:
    logging.warning("No custom DC embeddings found, so none will be loaded.")
    return

  custom_idx = config.EmbeddingsIndex(
      name=config.CUSTOM_DC_INDEX,
      embeddings_file_name=os.path.basename(custom_embeddings_local_path),
      embeddings_local_path=custom_embeddings_local_path)

  # This lookup will raise an error if embeddings weren't already initialized previously.
  # This is intentional.
  nl_embeddings: embeddings_store.Store = app.config[config.NL_EMBEDDINGS_KEY]
  # Merge custom index with default embeddings.
  nl_embeddings.merge_custom_index(custom_idx)

  # Update app config.
  _update_app_config(app, app.config[config.NL_MODEL_KEY], nl_embeddings,
                     embeddings_map)
  # Update cache.
  _maybe_cache(flask_env, nl_embeddings, None)


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


def _update_app_config(app: Flask, nl_model: NLAttributeModel,
                       nl_embeddings: embeddings_store.Store,
                       embeddings_map: Dict[str, str]):
  app.config[config.NL_MODEL_KEY] = nl_model
  app.config[config.NL_EMBEDDINGS_KEY] = nl_embeddings
  app.config[config.NL_EMBEDDINGS_VERSION_KEY] = embeddings_map


def _maybe_cache(flask_env: str, nl_embeddings: embeddings_store.Store,
                 nl_model: NLAttributeModel):
  if not nl_embeddings and not nl_model:
    return

  if _use_cache(flask_env):
    with Cache(NL_CACHE_PATH, size_limit=_NL_CACHE_SIZE_LIMIT) as reference:
      if nl_embeddings:
        reference.set(NL_EMBEDDINGS_CACHE_KEY,
                      nl_embeddings,
                      expire=_NL_CACHE_EXPIRE)
      if nl_model:
        reference.set(NL_MODEL_CACHE_KEY, nl_model, expire=_NL_CACHE_EXPIRE)


def _maybe_load_custom_dc_yaml():
  # The path comes from:
  # https://github.com/datacommonsorg/website/blob/master/server/routes/admin/html.py#L39-L40
  base = os.environ.get('SQL_DATA_PATH')
  if not base:
    return None

  # TODO: Consider reading the base path from a "version.txt" instead
  # of hardcoding `data`
  file_path = os.path.join(base, f'data/nl/{_CUSTOM_EMBEDDINGS_YAML}')
  logging.info("Custom embeddings YAML path: %s", file_path)

  if os.path.exists(file_path):
    with open(file_path) as f:
      return yaml.full_load(f)

  logging.info(
      "Custom embeddings YAML NOT found. Custom embeddings will NOT be loaded.")
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
