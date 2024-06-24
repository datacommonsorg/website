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
from dataclasses import field
from enum import Enum
from typing import Dict, List

import dacite


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
  source_folder: str = None
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


# Check
# https://github.com/datacommonsorg/website/assets/5951856/81bfdf68-0119-4755-95f3-2742cc74655c
# to see the relation between the following configs and the Registry object.


@dataclass(kw_only=True)
class Catalog:
  """
  This represents the full catalog of models and indexes.

  Only a subset of them are enabled/used by the Env config at runtime.
  """
  version: str = None
  indexes: Dict[str, IndexConfig]
  models: Dict[str, ModelConfig]


@dataclass(kw_only=True)
class Env:
  """
  A class to represent the NL server environment config.
  This object is used with the Catalog object to configure the server.
  """
  default_indexes: List[str]
  enabled_indexes: List[str]
  vertex_ai_models: Dict[str, VertexAIModelConfig] = field(default_factory=dict)
  enable_reranking: bool = False

  def from_dict(d):
    return dacite.from_dict(data_class=Env, data=d)


@dataclass(kw_only=True)
class ServerConfig:
  """
  A class to hold the runtime server config.

  This config is obtained from the catalog and environment config.
  """
  version: str
  default_indexes: List[str]
  indexes: Dict[str, IndexConfig]
  models: Dict[str, ModelConfig]
  enable_reranking: bool
