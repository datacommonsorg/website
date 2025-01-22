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

import logging
from typing import Dict

from nl_server import config_reader
from nl_server.config import IndexConfig
from nl_server.config import ModelConfig
from nl_server.config import ModelUsage
from nl_server.config import ServerConfig
from nl_server.config import StoreType
from nl_server.embeddings import Embeddings
from nl_server.embeddings import EmbeddingsModel
from nl_server.embeddings import NoEmbeddingsException
from nl_server.model.attribute_model import AttributeModel
from nl_server.model.create import create_embeddings_model
from nl_server.ranking import RerankingModel
from nl_server.store.memory import MemoryEmbeddingsStore
from nl_server.store.vertexai import VertexAIStore
from shared.lib.custom_dc_util import is_custom_dc

REGISTRY_KEY: str = 'REGISTRY'


class Registry:
  """
  A class to hold runtime model handle/client objects and embeddings stores.
  """

  def __init__(self, server_config: ServerConfig):
    self.name_to_emb: dict[str, Embeddings] = {}
    self.name_to_model: Dict[str, EmbeddingsModel | RerankingModel] = {}
    self._attribute_model = AttributeModel()
    self.load(server_config)

  # Note: The caller takes care of exceptions.
  # TODO: consider consistent naming among index and embedding.
  def get_index(self, index_type: str) -> Embeddings:
    return self.name_to_emb.get(index_type)

  def get_reranking_model(self, model_name: str) -> RerankingModel:
    if (model_name not in self.name_to_model or
        self._server_config.models[model_name].usage != ModelUsage.RERANKING):
      raise ValueError(f'Invalid model name: {model_name}')
    return self.name_to_model.get(model_name)

  def get_attribute_model(self) -> AttributeModel:
    return self._attribute_model

  def get_embedding_model(self, model_name: str) -> EmbeddingsModel:
    if (model_name not in self.name_to_model or
        self._server_config.models[model_name].usage != ModelUsage.EMBEDDINGS):
      raise ValueError(f'Invalid model name: {model_name}')
    return self.name_to_model.get(model_name)

  def server_config(self) -> ServerConfig:
    return self._server_config

  # Load the registry from the server config
  def load(self, server_config: ServerConfig):
    self._server_config = server_config
    self._load_models(server_config.models)
    for idx_name, idx_info in server_config.indexes.items():
      self._set_embeddings(idx_name, idx_info)

  # Loads a dict of model name -> model info
  def _load_models(self, models: dict[str, ModelConfig]):
    for model_name, model_config in models.items():
      # if model has already been loaded, continue
      if model_name in self.name_to_model:
        continue

      # try creating a model object from the model info
      try:
        self.name_to_model[model_name] = create_embeddings_model(model_config)
      except Exception as e:
        logging.error(f'error loading model {model_name}: {str(e)} ')
        raise e

  # Sets an index to the name_to_emb
  def _set_embeddings(self, idx_name: str, idx_info: IndexConfig):
    # try creating a store object from the index info
    store = None
    try:
      if idx_info.store_type == StoreType.MEMORY:
        store = MemoryEmbeddingsStore(idx_info)
      elif idx_info.store_type == StoreType.VERTEXAI:
        store = VertexAIStore(idx_info)
    except NoEmbeddingsException as e:
      if not is_custom_dc():
        raise e
      # Some custom DCs may not have SVs or topics in which case no embeddings is a valid condition.
      # We log a warning and skip it in that case.
      logging.warning(
          f'No embeddings found for the following index and will be skipped: {idx_info}'
      )
      store = None
    except Exception as e:
      logging.error(f'error loading index {idx_name}: {str(e)} ')
      raise e

    # if store successfully created, set it in name_to_emb
    if store and idx_info.model in self.name_to_model:
      self.name_to_emb[idx_name] = Embeddings(
          model=self.name_to_model[idx_info.model], store=store)


def build(additional_catalog: dict = None,
          additional_catalog_path: str = None) -> Registry:
  """
  Build the registry based on available catalog and environment config files.
  This also get all the model/index resources downloaded and ready to use.

  Args:
    additional_catalog: additional catalog config to be merged with the default
    catalog.
  """
  catalog = config_reader.read_catalog(
      catalog_dict=additional_catalog,
      additional_catalog_path=additional_catalog_path)
  env = config_reader.read_env()
  server_config = config_reader.get_server_config(catalog, env)
  return Registry(server_config)
