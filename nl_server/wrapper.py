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
"""Abstract and wrapper classes for Embeddings."""

from abc import ABC
from abc import abstractmethod
from typing import List

import torch

import nl_server.embeddings_util as util
from shared.lib.detected_variables import VarCandidates


#
# Abstract class for an Embeddings model which takes a list of
# sentences and returns either a list of vectors or a 2d Tensor.
#
class EmbeddingsModel(ABC):

  def __init__(self, returns_tensor=False):
    self.returns_tensor = returns_tensor

  @abstractmethod
  def encode(self, queries: List[str]) -> List[List[float]] | torch.Tensor:
    pass


#
# Abstract class for an Embeddings store which takes a list of
# vectors or a 2d Tensor, and returns a corresponding list of
# VarCandidates.
#
class EmbeddingsStore(ABC):

  def __init__(self, needs_tensor=False):
    self.needs_tensor = needs_tensor

  @abstractmethod
  def vector_search(self, query_embeddings: List[List[float]] | torch.Tensor,
                    top_k: int) -> List[VarCandidates]:
    pass


# A simple wrapper around EmbeddingsModel + EmbeddingsStore.
class Embeddings:

  def __init__(self, model: EmbeddingsModel, store: EmbeddingsStore):
    self.model: EmbeddingsModel = model
    self.store: EmbeddingsStore = store

  def search_vars(self,
                  queries: List[str],
                  skip_topics: bool = False) -> List[VarCandidates]:
    query_embeddings = self.model.encode(queries)

    if self.model.returns_tensor and not self.store.needs_tensor:
      # Convert to List[List[float]]
      query_embeddings = query_embeddings.tolist()
    elif not self.model.returns_tensor and self.store.needs_tensor:
      # Convert to torch.Tensor
      query_embeddings = torch.tensor(query_embeddings, dtype=torch.float)

    top_k = util.get_topk(skip_topics)

    # Call the store.
    results = self.store.vector_search(query_embeddings, top_k)

    if skip_topics:
      return util.trim_topics(results)
    return results
