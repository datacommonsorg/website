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

from dataclasses import dataclass
from enum import Enum
from typing import Dict

from shared.lib import constants

# Index constants.  Passed in `url=`
CUSTOM_DC_INDEX: str = 'custom_ft'

# App Config constants.
# Key for the registry that holds model objects/client and embedding store.
REGISTRY_KEY: str = 'NL_REGISTRY'
# Key for the catalog object that holds model and index configs.
CATALOG_KEY: str = 'NL_CATALOG'
# Key for the environment config object.
ENV_KEY: str = 'NL_ENV'

# Query to use to check index health if this is the default index.
_HEALTHCHECK_QUERY = 'health'


class StoreType(str, Enum):
  MEMORY = 'MEMORY'
  LANCEDB = 'LANCEDB'
  VERTEXAI = 'VERTEXAI'


class ModelType(str, Enum):
  LOCAL = 'LOCAL'
  VERTEXAI = 'VERTEXAI'


class ModelUsage(str, Enum):
  EMBEDDINGS = 'EMBEDDINGS'
  RERANKING = 'RERANKING'


@dataclass(kw_only=True)
class ModelConfig:
  type: str = None
  usage: str = None
  score_threshold: float = None


@dataclass(kw_only=True)
class VertexAIModelConfig(ModelConfig):
  project_id: str = None
  location: str = None
  prediction_endpoint_id: str = None


@dataclass(kw_only=True)
class LocalModelConfig(ModelConfig):
  gcs_folder: str = None


@dataclass(kw_only=True)
class IndexConfig:
  store_type: str = None
  model: str = None
  healthcheck_query: str = 'health'


@dataclass(kw_only=True)
class MemoryIndexConfig(IndexConfig):
  embeddings_path: str = None


@dataclass(kw_only=True)
class LanceDBIndexConfig(IndexConfig):
  embeddings_path: str = None


@dataclass(kw_only=True)
class VertexAIIndexConfig(IndexConfig):
  project_id: str = None
  location: str = None
  index_endpoint_root: str = None
  index_endpoint: str = None
  index_id: str = None


# This represents the full catalog of models and indexes.
# Only a subset of them are enabled/used by the Env config at runtime.
@dataclass(kw_only=True)
class Catalog:
  version: str = None
  indexes: Dict[str, IndexConfig]
  models: Dict[str, ModelConfig]


# Determines whether model is enabled
def _is_model_enabled(model_name: str, model_info: Dict[str, str],
                      used_models: set[str], reranking_enabled: bool):
  if model_name in used_models:
    return True
  if model_info['usage'] == ModelUsage.RERANKING and reranking_enabled:
    return True
  return False


#
# Parse the input `embeddings.yaml` dict representation into Catalog
# object.
#
def parse(catalog_dict: Dict[str, any], vertex_ai_model_info: Dict[str, any],
          reranking_enabled: bool) -> Catalog:
  if catalog_dict['version'] == 1:
    return parse_v1(catalog_dict, vertex_ai_model_info, reranking_enabled)
  else:
    raise AssertionError('Could not parse catalog: unsupported version.')


#
# Parses the v1 version of the `embeddings.yaml` dict representation into
# Catalog object.
#
def parse_v1(catalog_dict: Dict[str, any], vertex_ai_model_info: Dict[str, any],
             reranking_enabled: bool) -> Catalog:
  used_models = set()

  # parse the indexes
  indexes = {}
  for index_name, index_info in catalog_dict.get('indexes', {}).items():
    store_type = index_info['store_type']
    used_models.add(index_info['model'])
    healthcheck_query = index_info.get('healthcheck_query', _HEALTHCHECK_QUERY)
    if store_type == StoreType.MEMORY:
      indexes[index_name] = MemoryIndexConfig(
          store_type=store_type,
          model=index_info['model'],
          embeddings_path=index_info['embeddings_path'],
          healthcheck_query=healthcheck_query)
    elif store_type == StoreType.LANCEDB:
      indexes[index_name] = LanceDBIndexConfig(
          store_type=store_type,
          model=index_info['model'],
          embeddings_path=index_info['embeddings_path'],
          healthcheck_query=healthcheck_query)
    elif store_type == StoreType.VERTEXAI:
      indexes[index_name] = VertexAIIndexConfig(
          store_type=store_type,
          model=index_info['model'],
          project_id=index_info['project_id'],
          location=index_info['location'],
          index_endpoint_root=index_info['index_endpoint_root'],
          index_endpoint=index_info['index_endpoint'],
          index_id=index_info['index_id'],
          healthcheck_query=healthcheck_query)
    else:
      raise AssertionError(
          'Error parsing information for index {index_name}: unsupported store type {store_type}'
      )

  # parse the models
  models = {}
  for model_name, model_info in catalog_dict.get('models', {}).items():
    if not _is_model_enabled(model_name, model_info, used_models,
                             reranking_enabled):
      continue

    model_type = model_info['type']
    score_threshold = model_info.get('score_threshold',
                                     constants.SV_SCORE_DEFAULT_THRESHOLD)
    if model_type == ModelType.LOCAL:
      models[model_name] = LocalModelConfig(type=model_type,
                                            score_threshold=score_threshold,
                                            usage=model_info['usage'],
                                            gcs_folder=model_info['gcs_folder'])
    elif model_type == ModelType.VERTEXAI:
      models[model_name] = VertexAIModelConfig(
          type=model_type,
          score_threshold=score_threshold,
          usage=model_info['usage'],
          project_id=vertex_ai_model_info[model_name]['project_id'],
          prediction_endpoint_id=vertex_ai_model_info[model_name]
          ['prediction_endpoint_id'],
          location=vertex_ai_model_info[model_name]['location'])
    else:
      raise AssertionError(
          'Error parsing information for model {model_name}: unsupported type {model_type}'
      )
  return Catalog(indexes=indexes, models=models)
