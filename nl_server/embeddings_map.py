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
from typing import Dict

from nl_server.config import EmbeddingsConfig
from nl_server.config import IndexConfig
from nl_server.config import ModelConfig
from nl_server.config import ModelType
from nl_server.config import ModelUsage
from nl_server.config import StoreType
from nl_server.embeddings import Embeddings
from nl_server.embeddings import EmbeddingsModel
from nl_server.model.sentence_transformer import LocalSentenceTransformerModel
from nl_server.model.vertexai import VertexAIEmbeddingsModel
from nl_server.model.vertexai import VertexAIRerankingModel
from nl_server.ranking import RerankingModel
from nl_server.store.memory import MemoryEmbeddingsStore
from nl_server.store.vertexai import VertexAIStore
from shared.lib.custom_dc_util import is_custom_dc


#
# A map from specific index to embeddings stores and models.
#
class EmbeddingsMap:

  # Input is parsed embeddings config.
  def __init__(self, embeddings_config: EmbeddingsConfig):
    self.embeddings_map: dict[str, Embeddings] = {}
    self.name_to_emb_model: Dict[str, EmbeddingsModel] = {}
    self.name_to_rank_model: Dict[str, RerankingModel] = {}

    self.reset_index(embeddings_config)

  # Note: The caller takes care of exceptions.
  def get_index(self, index_type: str) -> Embeddings:
    return self.embeddings_map.get(index_type)

  def get_reranking_model(self, model_name: str) -> RerankingModel:
    return self.name_to_rank_model.get(model_name)

  # Adds the new models and indexes in a embeddings_info object to the
  # embeddings
  def reset_index(self, embeddings_info: EmbeddingsConfig):
    self._load_models(embeddings_info.models)
    for idx_name, idx_info in embeddings_info.indexes.items():
      self._set_embeddings(idx_name, idx_info)

  # Loads a dict of model name -> model info
  def _load_models(self, models: dict[str, ModelConfig]):
    for model_name, model_info in models.items():
      # if model has already been loaded, continue
      if (model_name in self.name_to_emb_model or
          model_name in self.name_to_rank_model):
        continue

      # try creating a model object from the model info
      try:
        if model_info.type == ModelType.VERTEXAI:
          if model_info.usage == ModelUsage.EMBEDDINGS:
            model = VertexAIEmbeddingsModel(model_info)
            self.name_to_emb_model[model_name] = model
          elif model_info.usage == ModelUsage.RERANKING:
            model = VertexAIRerankingModel(model_info)
            self.name_to_rank_model[model_name] = model
        elif model_info.type == ModelType.LOCAL:
          model = LocalSentenceTransformerModel(model_info)
          self.name_to_emb_model[model_name] = model
      except Exception as e:
        logging.error(f'error loading model {model_name}: {str(e)} ')
        raise e

  # Sets an index to the embeddings map
  def _set_embeddings(self, idx_name: str, idx_info: IndexConfig):
    # try creating a store object from the index info
    store = None
    try:
      if idx_info.store_type == StoreType.MEMORY:
        store = MemoryEmbeddingsStore(idx_info)
      elif idx_info.store_type == StoreType.LANCEDB:
        # Lance DB's X86_64 lib doesn't run on MacOS Silicon, and
        # this causes trouble for NL Server in Custom DC docker
        # for MacOS Mx users. So skip using LanceDB for Custom DC.
        # TODO: Drop this once Custom DC docker is fixed.
        if not is_custom_dc():
          from nl_server.store.lancedb import LanceDBStore
          store = LanceDBStore(idx_info)
        else:
          logging.info('Not loading LanceDB in Custom DC environment!')
          return
      elif idx_info.store_type == StoreType.VERTEXAI:
        store = VertexAIStore(idx_info)
    except Exception as e:
      logging.error(f'error loading index {idx_name}: {str(e)} ')
      raise e

    # if store successfully created, set it in embeddings_map
    if store and idx_info.model in self.name_to_emb_model:
      self.embeddings_map[idx_name] = Embeddings(
          model=self.name_to_emb_model[idx_info.model], store=store)
