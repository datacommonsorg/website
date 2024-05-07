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
from typing import Dict

from diskcache import Cache
from flask import Flask
import yaml

from nl_server import config
import nl_server.embeddings_map as emb_map
from nl_server.nl_attribute_model import NLAttributeModel
from shared.lib.custom_dc_util import get_user_data_path
from shared.lib.gcs import download_gcs_file
from shared.lib.gcs import is_gcs_path
from shared.lib.gcs import join_gcs_path
import shared.model.loader as model_loader

_EMBEDDINGS_YAML = 'embeddings.yaml'
_CUSTOM_EMBEDDINGS_YAML_PATH = 'datacommons/nl/custom_embeddings.yaml'

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

  embeddings_dict = _load_yaml(flask_env)
  vertex_ai_models = {}
  if _use_vertex_ai(flask_env):
    vertex_ai_models = model_loader.load_models('EMBEDDING')

  # In local dev, cache the embeddings on disk so each hot reload won't download
  # the embeddings again.
  if _use_cache(flask_env):
    cache = Cache(NL_CACHE_PATH, size_limit=_NL_CACHE_SIZE_LIMIT)
    cache.expire()

    nl_model = cache.get(NL_MODEL_CACHE_KEY)
    nl_embeddings = cache.get(NL_EMBEDDINGS_CACHE_KEY)
    if nl_model and nl_embeddings:
      _update_app_config(app, nl_model, nl_embeddings, embeddings_dict,
                         vertex_ai_models)
      return

  nl_embeddings = emb_map.EmbeddingsMap(embeddings_dict)
  nl_model = NLAttributeModel()
  _update_app_config(app, nl_model, nl_embeddings, embeddings_dict,
                     vertex_ai_models)

  _maybe_update_cache(flask_env, nl_embeddings, nl_model)


def load_custom_embeddings(app: Flask):
  """Loads custom DC embeddings at runtime.

  This method should only be called at runtime (i.e. NOT at startup).
  It assumes that embeddings were already initialized at startup and this method
  only merges any newly loaded custom embeddings with the default embeddings.

  NOTE that this method requires that the custom embeddings be available
  on a local path.
  """
  flask_env = os.environ.get('FLASK_ENV')
  embeddings_map = _load_yaml(flask_env)
  custom_embeddings_path = embeddings_map.get(config.CUSTOM_DC_INDEX)
  if not custom_embeddings_path:
    logging.warning("No custom DC embeddings found, so none will be loaded.")
    return
  # Construct the Custom EmbeddingsIndex by calling into parse() to
  # set fields like tuned_model correctly.
  custom_idx_list = config.parse(
      {config.CUSTOM_DC_INDEX: custom_embeddings_path})
  if not custom_idx_list:
    logging.warning(f"Unable to parse {custom_embeddings_path}")
    return

  # This lookup will raise an error if embeddings weren't already initialized previously.
  # This is intentional.
  nl_embeddings: emb_map.EmbeddingsMap = app.config[config.NL_EMBEDDINGS_KEY]
  # Reset the custom DC index.
  nl_embeddings.reset_index(custom_idx_list[0])

  # Update app config.
  _update_app_config(app, app.config[config.NL_MODEL_KEY], nl_embeddings,
                     embeddings_map)
  # Update cache.
  _maybe_update_cache(flask_env, nl_embeddings, None)


def _load_yaml(flask_env: str) -> Dict[str, str]:
  with open(get_env_path(flask_env, _EMBEDDINGS_YAML)) as f:
    embeddings_map = yaml.full_load(f)

    # For custom DC dev env, only keep the default index.
    if _is_custom_dc_dev(flask_env):
      embeddings_map = {
          config.DEFAULT_INDEX_TYPE: embeddings_map[config.DEFAULT_INDEX_TYPE]
      }

  assert embeddings_map, 'No embeddings.yaml found!'

  custom_map = _maybe_load_custom_dc_yaml()
  if custom_map:
    embeddings_map.update(custom_map)

  return embeddings_map


def _update_app_config(app: Flask,
                       nl_model: NLAttributeModel,
                       nl_embeddings: emb_map.EmbeddingsMap,
                       embeddings_map: Dict[str, str],
                       vertex_ai_models: Dict[str, Dict] = None):
  app.config[config.NL_MODEL_KEY] = nl_model
  app.config[config.NL_EMBEDDINGS_KEY] = nl_embeddings
  app.config[config.NL_EMBEDDINGS_VERSION_KEY] = embeddings_map
  app.config[config.VERTEX_AI_MODELS_KEY] = vertex_ai_models or {}


def _maybe_update_cache(flask_env: str, nl_embeddings: emb_map.EmbeddingsMap,
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
  base = get_user_data_path()
  if not base:
    return None

  # TODO: Consider reading the base path from a "version.txt" instead
  # of hardcoding `data`
  if is_gcs_path(base):
    gcs_path = join_gcs_path(base, _CUSTOM_EMBEDDINGS_YAML_PATH)
    logging.info('Downloading custom embeddings yaml from GCS path: %s',
                 gcs_path)
    file_path = download_gcs_file(gcs_path)
    if not file_path:
      logging.info(
          "Custom embeddings yaml in GCS not found: %s. Custom embeddings will not be loaded.",
          gcs_path)
      return None
  else:
    file_path = os.path.join(base, _CUSTOM_EMBEDDINGS_YAML_PATH)

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
  if flask_env in ['local', 'test', 'integration_test', 'webdriver'
                  ] or _is_custom_dc_dev(flask_env):
    return os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        f'deploy/nl/{file_name}')

  return f'/datacommons/nl/{file_name}'


def _use_vertex_ai(flask_env):
  return flask_env in ['local', 'test', 'integration_test', 'autopush']


def _use_cache(flask_env):
  return flask_env in ['local', 'integration_test', 'webdriver']


def _is_custom_dc_dev(flask_env: str) -> bool:
  return flask_env == 'custom_dev'
