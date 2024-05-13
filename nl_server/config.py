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

from abc import ABC
from dataclasses import dataclass
from enum import Enum
import json
import logging
import os
from pathlib import Path
from typing import Dict

import yaml

# Index constants.  Passed in `url=`
CUSTOM_DC_INDEX: str = 'custom_ft'
DEFAULT_INDEX_TYPE: str = 'medium_ft'

# The default base model we use.
EMBEDDINGS_BASE_MODEL_NAME: str = 'all-MiniLM-L6-v2'

# App Config constants.
ATTRIBUTE_MODEL_KEY: str = 'ATTRIBUTE_MODEL'
NL_EMBEDDINGS_KEY: str = 'NL_EMBEDDINGS'
NL_EMBEDDINGS_VERSION_KEY: str = 'NL_EMBEDDINGS_VERSION_MAP'
VERTEX_AI_MODELS_KEY: str = 'VERTEX_AI_MODELS'

_VERTEX_AI_MODEL_CONFIG_PATH: str = '/datacommons/nl/vertex_ai_models.json'


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


@dataclass
class ModelConfig(ABC):
  type: str
  usage: str


@dataclass
class VertexAIModelConfig(ModelConfig):
  project_id: str
  location: str
  prediction_endpoint_id: str


@dataclass
class LocalModelConfig(ModelConfig):
  gcs_folder: str = ''


@dataclass
class IndexConfig(ABC):
  store_type: str
  model: str


@dataclass
class MemoryIndexConfig(IndexConfig):
  embeddings_path: str


@dataclass
class LanceDBIndexConfig(IndexConfig):
  embeddings_path: str


@dataclass
class VertexAIIndexConfig(IndexConfig):
  project_id: str
  location: str
  index_endpoint_root: str
  index_endpoint: str
  index_id: str


# Defines one embeddings index config.
@dataclass
class EmbeddingsConfig:
  indexes: Dict[str, IndexConfig]
  models: Dict[str, ModelConfig]


#
# Get Dict of vertex ai model to its info
#
def _get_vertex_ai_model_info() -> Dict[str, any]:
  # This is the path to model info when deployed in gke.
  if os.path.exists(_VERTEX_AI_MODEL_CONFIG_PATH):
    with open(_VERTEX_AI_MODEL_CONFIG_PATH) as f:
      return json.load(f) or {}
  # If that path doesn't exist, assume we are running locally and use the values
  # from autopush.
  else:
    current_file_path = Path(__file__)
    autopush_env_values = f'{current_file_path.parent.parent}/deploy/helm_charts/envs/autopush.yaml'
    with open(autopush_env_values) as f:
      autopush_env = yaml.full_load(f)
      return autopush_env['nl']['vertex_ai_models']


#
# Parse the input `embeddings.yaml` dict representation into EmbeddingsInfo
# object.
#
def parse(embeddings_map: Dict[str, any]) -> EmbeddingsConfig:
  get_vertex_ai_model_info = _get_vertex_ai_model_info()
  if embeddings_map['version'] == 1:
    return parse_v1(embeddings_map, get_vertex_ai_model_info)
  else:
    raise AssertionError('Could not parse embeddings map: unsupported version.')


#
# Parses the v1 version of the `embeddings.yaml` dict representation into
# EmbeddingsInfo object.
#
def parse_v1(embeddings_map: Dict[str, any],
             vertex_ai_model_info: Dict[str, any]) -> EmbeddingsConfig:
  # parse the models
  models = {}
  for model_name, model_info in embeddings_map.get('models', {}).items():
    model_type = model_info['type']
    if model_type == ModelType.LOCAL:
      models[model_name] = LocalModelConfig(type=model_type,
                                            usage=model_info['usage'],
                                            gcs_folder=model_info['gcs_folder'])
    elif model_type == ModelType.VERTEXAI:
      if model_name not in vertex_ai_model_info:
        logging.error(
            f'Could not find vertex ai model information for {model_name}')
        continue
      models[model_name] = VertexAIModelConfig(
          type=model_type,
          usage=model_info['usage'],
          project_id=vertex_ai_model_info[model_name]['project_id'],
          prediction_endpoint_id=vertex_ai_model_info[model_name]
          ['prediction_endpoint_id'])
    else:
      raise AssertionError(
          'Error parsing information for model {model_name}: unsupported type {model_type}'
      )

  # parse the indexes
  indexes = {}
  for index_name, index_info in embeddings_map.get('indexes', {}).items():
    store_type = index_info['store']
    if store_type == StoreType.MEMORY:
      indexes[index_name] = MemoryIndexConfig(
          store_type=store_type,
          model=index_info['model'],
          embeddings_path=index_info['embeddings'])
    elif store_type == StoreType.LANCEDB:
      indexes[index_name] = LanceDBIndexConfig(
          store_type=store_type,
          model=index_info['model'],
          embeddings_path=index_info['embeddings'])
    elif store_type == StoreType.VERTEXAI:
      indexes[index_name] = VertexAIIndexConfig(
          store_type=store_type,
          model=index_info['model'],
          project_id=index_info['project_id'],
          location=index_info['location'],
          index_endpoint_root=index_info['index_endpoint_root'],
          index_endpoint=index_info['index_endpoint'],
          index_id=index_info['index_id'])
    else:
      raise AssertionError(
          'Error parsing information for index {index_name}: unsupported store type {store_type}'
      )

  return EmbeddingsConfig(indexes=indexes, models=models)


# Returns true if VERTEXAI type models and VERTEXAI type stores are allowed
def allow_vertex_ai() -> bool:
  return os.environ.get('FLASK_ENV') in [
      'local', 'test', 'integration_test', 'autopush', 'dev'
  ]
