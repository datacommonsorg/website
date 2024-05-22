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

from dataclasses import dataclass
import logging
import os
from pathlib import Path
from typing import Dict, List

from flask import Flask
import yaml

from nl_server import config
from nl_server.custom_dc_constants import CUSTOM_DC_ENV
from nl_server.registry import Registry
from shared.lib.custom_dc_util import get_custom_dc_user_data_path
from shared.lib.custom_dc_util import is_custom_dc
from shared.lib.gcs import is_gcs_path
from shared.lib.gcs import maybe_download

_EMBEDDINGS_YAML = 'embeddings.yaml'
_CUSTOM_EMBEDDINGS_YAML_PATH = 'datacommons/nl/custom_embeddings.yaml'
_ENV_PATH: str = '/datacommons/nl/env.yaml'
_LOCAL_ENV_VALUES_PATH: str = f'{Path(__file__).parent.parent}/deploy/helm_charts/envs/autopush.yaml'


@dataclass
class Env:
  default_indexes: List[str]
  enabled_indexes: List[str]
  vertex_ai_model_info: Dict[str, any]
  enable_reranking: bool


#
# Reads the yaml files and loads all the server state.
#
def load_server_state(app: Flask):
  flask_env = os.environ.get('FLASK_ENV')

  nl_env = _get_env()
  catalog_dict = _load_yaml(flask_env, nl_env.enabled_indexes)
  catalog = config.parse(catalog_dict, nl_env.vertex_ai_model_info,
                         nl_env.enable_reranking)
  registry = Registry(catalog)
  _update_app_config(app, registry, catalog, nl_env)


def load_custom_embeddings(app: Flask):
  """Loads custom DC embeddings at runtime.

  This method should only be called at runtime (i.e. NOT at startup).
  It assumes that embeddings were already initialized at startup and this method
  only merges any newly loaded custom embeddings with the default embeddings.

  NOTE that this method requires that the custom embeddings be available
  on a local path.
  """
  flask_env = os.environ.get('FLASK_ENV')
  nl_env = _get_env()
  catalog_dict = _load_yaml(flask_env, nl_env.enabled_indexes)

  # This lookup will raise an error if embeddings weren't already initialized previously.
  # This is intentional.
  registry: Registry = app.config[config.REGISTRY_KEY]
  try:
    catalog = config.parse(catalog_dict, nl_env.vertex_ai_model_info,
                           nl_env.enable_reranking)
    # Reset the custom DC index.
    registry.reset_index(catalog)
  except Exception as e:
    logging.error(f'Custom embeddings not loaded due to error: {str(e)}')

  # Update app config.
  _update_app_config(app, registry, catalog_dict, nl_env)


# Takes an embeddings map and returns a version that only has the default
# enabled indexes and its model info
def _get_enabled_only_emb_map(catalog_dict: Dict[str, any],
                              enabled_indexes: List[str]) -> Dict[str, any]:
  indexes = {}
  for index_name in enabled_indexes:
    indexes[index_name] = catalog_dict['indexes'][index_name]
  catalog_dict['indexes'] = indexes
  return catalog_dict


def _load_yaml(flask_env: str, enabled_indexes: List[str]) -> Dict[str, any]:
  with open(get_env_path(flask_env, _EMBEDDINGS_YAML)) as f:
    catalog_dict = yaml.full_load(f)
    catalog_dict = _get_enabled_only_emb_map(catalog_dict, enabled_indexes)

  assert catalog_dict, 'No embeddings.yaml found!'

  custom_catalog = _maybe_load_custom_dc_yaml()
  if custom_catalog:
    catalog_dict['indexes'].update(custom_catalog.get('indexes', {}))
    catalog_dict['models'].update(custom_catalog.get('models', {}))

  return catalog_dict


def _update_app_config(app: Flask, registry: Registry,
                       catalog_dict: Dict[str, any], env: Env):
  app.config[config.REGISTRY_KEY] = registry
  app.config[config.CATALOG_KEY] = catalog_dict
  app.config[config.ENV_KEY] = env


def _maybe_load_custom_dc_yaml():
  base = get_custom_dc_user_data_path()
  if not base:
    return None

  # TODO: Consider reading the base path from a "version.txt" instead
  # of hardcoding `data`
  if is_gcs_path(base):
    gcs_path = os.path.join(base, _CUSTOM_EMBEDDINGS_YAML_PATH)
    logging.info('Downloading custom embeddings yaml from GCS path: %s',
                 gcs_path)
    file_path = maybe_download(gcs_path)
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


def _is_custom_dc_dev(flask_env: str) -> bool:
  return flask_env == 'custom_dev'


# Get embedding index information for an instance
#
def _get_env() -> Env:
  env_dict = None

  # If custom dc, get from constant
  if is_custom_dc():
    env_dict = CUSTOM_DC_ENV
  # otherwise try to get from gke.
  elif os.path.exists(_ENV_PATH):
    with open(_ENV_PATH) as f:
      env_dict = yaml.full_load(f) or {}
  # If that path doesn't exist, assume we are running locally and use the values
  # from autopush.
  else:
    with open(_LOCAL_ENV_VALUES_PATH) as f:
      env_values = yaml.full_load(f)
      env_dict = env_values['nl']['env']

  return Env(
      env_dict.get('default_indexes', []),
      env_dict.get('enabled_indexes', []),
      # When vertex_ai_models the key exists, the value can be None. If value is
      # None, we still want to use an empty object.
      vertex_ai_model_info=env_dict.get('vertex_ai_models') or {},
      enable_reranking=env_dict.get('enable_reranking', False))
