# Copyright 2024 Google LLC
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

from dataclasses import asdict
import json
import logging
import os
from typing import Any, Dict

import yaml

from nl_server.config import Catalog
from nl_server.config import Env
from nl_server.config import IndexConfig
from nl_server.config import LanceDBIndexConfig
from nl_server.config import LocalModelConfig
from nl_server.config import MemoryIndexConfig
from nl_server.config import ModelConfig
from nl_server.config import ModelType
from nl_server.config import ModelUsage
from nl_server.config import ServerConfig
from nl_server.config import StoreType
from nl_server.config import VertexAIIndexConfig
from nl_server.config import VertexAIModelConfig
from shared.lib import custom_dc_util
from shared.lib import gcs


def _path_from_current_file(rel_path: str) -> str:
  """
  Get the path of a file relative to the current file.
  """
  return os.path.join(os.path.dirname(__file__), rel_path)


# catalog paths

# catalog from checked in file
_CATALOG_CODE_PATH = _path_from_current_file('../deploy/nl/catalog.yaml')
# catalog from mounted file, this is for GKE deployments
_CATALOG_MOUNT_PATH = '/datacommons/nl/catalog.yaml'
# catalog from user provided file, this is for custom DCs
# TODO: use absolute path set by user.
_CATALOG_USER_PATH_SUFFIX = 'datacommons/nl/custom_catalog.yaml'

# env paths

# env from checked in file for autopush instance. Used for local and testing.
_ENV_CODE_PATH = _path_from_current_file(
    '../deploy/helm_charts/envs/autopush.yaml')
# env from mounted file, this is for GKE deployments
_ENV_MOUNT_PATH = '/datacommons/nl/env.yaml'
# env from user provided file, this is for custom DCs
_ENV_USER_PATH = _path_from_current_file('custom_dc_env.yaml')

_CONFIG_V1 = '1'
_SUPPORTED_VERSIONS = frozenset([_CONFIG_V1])


def _merge_dicts(x, y):
  """
  Merge two dicts and prefer the latter on if both have a value.
  """
  res = {}
  for k, v in x.items():
    if v:
      res[k] = v
  for k, v in y.items():
    if v:
      res[k] = v
  return res


def _log_asdict(
    obj: Any,
    msg_prefix: str,
) -> None:
  obj_str = json.dumps(asdict(obj), indent=2)
  logging.info('%s:\n%s', msg_prefix, obj_str)


def merge_vertex_ai_configs(m: ModelConfig,
                            v: VertexAIModelConfig) -> VertexAIModelConfig:
  m_dict, v_dict = asdict(m), asdict(v)
  # Merge vertex AI config from catalog and env. Prefer env if both exist.
  merged = _merge_dicts(m_dict, v_dict)
  return VertexAIModelConfig(**merged)


# TODO: should accept a list of catalog paths because custom DC path won't be
# constant. i.e., we want this function to be:
# read_catalog(catalog_paths: [] = DEFAULT_PATHS, catalog_dict: Dict = None)
def read_catalog(catalog_dict: Dict = None) -> Catalog:
  """
  Reads the catalog from the config files and merges them together.

  One Config file could exist in several places depending on the environment.

  - `../../deploy/nl/catalog.yaml`
  - `/datacommons/nl/catalog.yaml`
  - `${USER_DATA_PATH}/datacommons/nl/custom_catalog.yaml`

  Note here ${USER_DATA_PATH} could be a local path or a GCS path (gcs://)
  """
  partial_catalogs = []

  if catalog_dict:
    partial_catalogs = [catalog_dict]
  else:
    # Note the check order here is (somewhat) important. The later config could
    # overwrite the earlier config.

    all_paths = []
    # Check the codebase config file
    if os.path.exists(_CATALOG_CODE_PATH):
      all_paths.append(_CATALOG_CODE_PATH)

    # Check mounted config file
    if os.path.exists(_CATALOG_MOUNT_PATH):
      all_paths.append(_CATALOG_MOUNT_PATH)

    # Then check user set config file
    # TODO: make this generic and independent of custom DC.
    # Currently this depends on the assumption of custom DC user sub path.
    user_data_path = custom_dc_util.get_custom_dc_user_data_path()

    if gcs.is_gcs_path(user_data_path):
      full_gcs_path = os.path.join(user_data_path, _CATALOG_USER_PATH_SUFFIX)
      local_user_catalog_path = gcs.maybe_download(full_gcs_path)
      if local_user_catalog_path:
        all_paths.append(local_user_catalog_path)
    else:
      full_user_path = os.path.join(user_data_path, _CATALOG_USER_PATH_SUFFIX)
      if os.path.exists(full_user_path):
        all_paths.append(full_user_path)

    for p in all_paths:
      logging.info('Loading index and model catalog from: %s', p)
      with open(p) as f:
        partial_catalogs.append(yaml.safe_load(f.read()))

  # Now load and merge all the catalog config files
  catalog = Catalog(
      version='',
      indexes={},
      models={},
  )
  for partial_catalog in partial_catalogs:
    # read version
    ver = catalog.version
    this_ver = partial_catalog['version']
    if (ver and this_ver and ver != this_ver):
      raise ValueError(
          f'Inconsistent version in config file {p}: {ver} and {this_ver}')

    if this_ver not in _SUPPORTED_VERSIONS:
      raise ValueError(f'Unsupported version: {this_ver} in file {p}')
    catalog.version = this_ver

    indexes = catalog.indexes
    models = catalog.models

    # TODO: when another version is added, extract separate version read as
    # a function.
    if this_ver == _CONFIG_V1:
      # read indexes
      for index_name, index_config in partial_catalog['indexes'].items():
        store_type = index_config['store_type']
        match store_type:
          case StoreType.MEMORY:
            indexes[index_name] = MemoryIndexConfig(**index_config)
          case StoreType.LANCEDB:
            indexes[index_name] = LanceDBIndexConfig(**index_config)
          case StoreType.VERTEXAI:
            indexes[index_name] = VertexAIIndexConfig(**index_config)
          case _:
            raise ValueError(f'Unknown store type: {store_type}')

      # read models
      for model_name, model_config in partial_catalog['models'].items():
        model_type = model_config['type']
        match model_type:
          case ModelType.LOCAL:
            models[model_name] = LocalModelConfig(**model_config)
          case ModelType.VERTEXAI:
            models[model_name] = VertexAIModelConfig(**model_config)
          case _:
            raise ValueError(f'Unknown model type: {model_type}')
  return catalog


def read_env() -> Env:
  """Reads the envs
  """
  # TODO: Make this generic by checking a user provided config file path
  if custom_dc_util.is_custom_dc():
    e = Env.from_dict(yaml.safe_load(open(_ENV_USER_PATH)))
  elif os.path.exists(_ENV_MOUNT_PATH):
    # env as mounted file. This is for GKE deployments
    e = Env.from_dict(yaml.safe_load(open(_ENV_MOUNT_PATH)))
  else:
    # use env from code. This is for local and testing
    with open(_ENV_CODE_PATH) as f:
      full_nl_config = yaml.safe_load(f.read())
      e = Env.from_dict(full_nl_config['nl']['env'])
  return e


def get_server_config(catalog: Catalog, env: Env) -> ServerConfig:
  """
  Merges the catalog and env into a server config.
  """
  # TODO: remove this check when custom DC can update the env.yaml.
  default_indexes = [x for x in env.default_indexes if x in catalog.indexes]

  # Add reranking models
  models: Dict[str, ModelConfig] = {}
  if env.enable_reranking:
    for model_name, model_config in catalog.models.items():
      if model_config.usage == ModelUsage.RERANKING:
        models[model_name] = model_config

  # Only add enabled indexes
  indexes: Dict[str, IndexConfig] = {}
  for index_name in env.enabled_indexes:
    if index_name not in catalog.indexes:
      logging.warning('Index %s not found in catalog', index_name)
      continue
    index_config = catalog.indexes[index_name]
    indexes[index_name] = index_config
    model_name = index_config.model
    if model_name not in catalog.models:
      raise ValueError(
          f'Model {model_name} from index {index_name} not found in catalog')
    models[model_name] = catalog.models[model_name]

  # Add vertex AI model info
  for model_name, model_config in models.items():
    if model_config.type == ModelType.VERTEXAI:
      if model_name not in env.vertex_ai_models:
        raise ValueError(f'Vertex AI Model {model_name} not found in env')
      models[model_name] = merge_vertex_ai_configs(
          models[model_name], env.vertex_ai_models[model_name])

  server_config = ServerConfig(
      version=catalog.version,
      default_indexes=default_indexes,
      enable_reranking=env.enable_reranking,
      indexes=indexes,
      models=models,
  )
  _log_asdict(server_config, 'server config')
  return server_config
