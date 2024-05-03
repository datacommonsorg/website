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
from typing import Dict, List

from nl_server.config import DEFAULT_INDEX_TYPE
from nl_server.config import EmbeddingsIndex
from nl_server.config import load
from nl_server.config import StoreType
from nl_server.embeddings import Embeddings
from nl_server.embeddings import EmbeddingsModel
from nl_server.model.sentence_transformer import LocalSentenceTransformerModel
from nl_server.store.memory import MemoryEmbeddingsStore
from nl_server.util import is_custom_dc


#
# A map from specific index to embeddings stores and models.
#
class EmbeddingsMap:

  # Input is the in-memory representation of `embeddings.yaml` structure.
  def __init__(self, embeddings_dict: dict[str, dict[str, str]]):
    self.embeddings_map: dict[str, Embeddings] = {}

    indexes: List[EmbeddingsIndex] = load(embeddings_dict)
    # Pre-load models once.
    self.name2model: Dict[str, EmbeddingsModel] = {}
    model2path = {idx.model_name: idx.model_local_path for idx in indexes}
    for model_name, model_path in model2path.items():
      self.name2model[model_name] = LocalSentenceTransformerModel(model_path)

    for idx in indexes:
      self._set_embeddings(idx)

  # Note: The caller takes care of exceptions.
  def get(self, index_type: str = DEFAULT_INDEX_TYPE) -> Embeddings:
    return self.embeddings_map.get(index_type)

  def reset_index(self, idx: EmbeddingsIndex):
    if idx.model_name not in self.name2model:
      self.name2model[idx.model_name] = \
        LocalSentenceTransformerModel(idx.model_local_path)
    self._set_embeddings(idx)

  def _set_embeddings(self, idx: EmbeddingsIndex) -> Embeddings:
    if idx.store_type == StoreType.MEMORY:
      self.embeddings_map[idx.name] = Embeddings(
          model=self.name2model[idx.model_name],
          store=MemoryEmbeddingsStore(idx.embeddings_local_path))
    elif idx.store_type == StoreType.LANCEDB:
      # Lance DB's X86_64 lib doesn't run on MacOS Silicon, and
      # this causes trouble for NL Server in Custom DC docker
      # for MacOS Mx users. So skip using LanceDB for Custom DC.
      # TODO: Drop this once Custom DC docker is fixed.
      if not is_custom_dc():
        from nl_server.store.lancedb import LanceDBStore
        self.embeddings_map[idx.name] = Embeddings(
            model=self.name2model[idx.model_name],
            store=LanceDBStore(idx.embeddings_local_path))
      else:
        logging.info('Not loading LanceDB in Custom DC environment!')