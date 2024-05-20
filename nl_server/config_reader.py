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
from pathlib import Path

from dacite import from_dict
import yaml

from nl_server.config import CatalogConfig
from nl_server.config import LanceDBIndexConfig
from nl_server.config import LocalModelConfig
from nl_server.config import MemoryIndexConfig
from nl_server.config import ModelType
from nl_server.config import ModelUsage
from nl_server.config import RuntimeConfig
from nl_server.config import ServerConfig
from nl_server.config import StoreType
from nl_server.config import VertexAIIndexConfig
from nl_server.config import VertexAIModelConfig
from shared.lib import custom_dc_util
from shared.lib import gcs

# catalog config paths
_CATALOG_CODE_PATH = Path(__file__).parent / '../deploy/nl/embeddings.yaml'
_CATALOG_MOUNT_PATH = '/datacommons/nl/embeddings.yaml'
_CATALOG_USER_PATH_SUFFIX = 'datacommons/nl/custom_embeddings.yaml'
_CATALOG_TMP_PATH = '/tmp/embeddings.yaml'

# runtime config paths
_RUNTIME_CODE_PATH = (Path(__file__).parent /
                      '../deploy/helm_charts/envs/autopush.yaml')
_RUNTIME_MOUNT_PATH = '/datacommons/nl/runtime.json'
_RUNTIME_USER_PATH = Path(__file__).parent / 'custom_dc_runtime.yaml'

_SUPPORTED_VERSIONS = [1]


def _merge_dicts(x, y):
  res = {}
  for k, v in x.items():
    if v:
      res[k] = v
  for k, v in y.items():
    if v:
      res[k] = v
  return res


def read_catalog_config() -> CatalogConfig:
  """
  Reads the catalog from the config files and merges them together.

  One Config file could exist in several places depending on the environment.

  - `../../deploy/nl/embeddings.yaml`
  - `/datacommons/nl/embeddings.yaml`
  - `${USER_DATA_PATH}/datacommons/nl/custom_embeddings.yaml`

  Note here ${USER_DATA_PATH} could be a local path or a GCS path (gcs://)
  """
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
    if gcs.download_blob_by_path(full_gcs_path, _CATALOG_TMP_PATH):
      all_paths.append(_CATALOG_TMP_PATH)
  else:
    full_user_path = os.path.join(user_data_path, _CATALOG_USER_PATH_SUFFIX)
    if os.path.exists(full_user_path):
      all_paths.append(full_user_path)

  # Now load and merge all the catalog config files
  catalog = CatalogConfig(
      version='',
      indexes={},
      models={},
  )
  for p in all_paths:
    logging.info('Loading index and model catalog from: %s', p)
    with open(p) as f:
      partial_catalog = yaml.safe_load(f.read())
      # read version
      ver = catalog.version
      this_ver = partial_catalog['version']
      if (ver and this_ver and ver != this_ver):
        raise ValueError(
            f'Inconsistent version in config files: {ver} and {this_ver}')

      if this_ver not in _SUPPORTED_VERSIONS:
        raise ValueError(f'Unknown version: {this_ver}')
      catalog.version = this_ver

      indexes = catalog.indexes
      models = catalog.models

      # TODO: when another version is added, extract separate version read as
      # a function.
      if this_ver == 1:
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
  logging.debug(json.dumps(asdict(catalog), indent=2))
  return catalog


def read_runtime_config() -> RuntimeConfig:
  """
  Reads the runtime config.
  """
  # TODO: Make this generic by checking a user provided config file path
  if custom_dc_util.is_custom_dc():
    c = from_dict(data_class=RuntimeConfig,
                  data=yaml.safe_load(open(_RUNTIME_USER_PATH)))
  elif os.path.exists(_RUNTIME_MOUNT_PATH):
    c = from_dict(data_class=RuntimeConfig,
                  data=yaml.safe_load(open(_RUNTIME_MOUNT_PATH)))
  else:
    with open(_RUNTIME_CODE_PATH) as f:
      full_nl_config = yaml.safe_load(f.read())
      c = from_dict(data_class=RuntimeConfig,
                    data=full_nl_config['nl']['runtime'])
  logging.debug(json.dumps(asdict(c), indent=2))
  return c


def get_server_config(catalog_config: CatalogConfig,
                      runtime_config: RuntimeConfig) -> ServerConfig:
  """
  Merges the catalog and runtime config into a server config.
  """
  server_config = ServerConfig(
      version=catalog_config.version,
      default_indexes=runtime_config.default_indexes,
      enable_reranking=runtime_config.enable_reranking,
      indexes={},
      models={},
  )
  server_config.default_indexes = [
      x for x in server_config.default_indexes if x in catalog_config.indexes
  ]

  # Add reranking models
  if runtime_config.enable_reranking:
    for model_name, model_config in catalog_config.models.items():
      if model_config.usage == ModelUsage.RERANKING:
        server_config.models[model_name] = model_config

  # Only add enabled indexes
  for index_name in runtime_config.enabled_indexes:
    if index_name not in catalog_config.indexes:
      logging.warning('Index %s not found in catalog', index_name)
      continue
    index_config = catalog_config.indexes[index_name]
    server_config.indexes[index_name] = index_config
    model_name = index_config.model
    server_config.models[model_name] = catalog_config.models[model_name]

  # Add vertex AI model info
  for model_name in server_config.models:
    if model_name in runtime_config.vertex_ai_models:
      m = server_config.models[model_name]
      v = runtime_config.vertex_ai_models[model_name]
      m_dict, v_dict = asdict(m), asdict(v)
      merged = _merge_dicts(m_dict, v_dict)
      server_config.models[model_name] = VertexAIModelConfig(**merged)

  config_str = json.dumps(asdict(server_config), indent=2)
  logging.info('server config:\n%s', config_str)
  return server_config
