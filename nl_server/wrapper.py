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
"""Abstract and wrapper classes for Embeddings."""

from abc import ABC
from abc import abstractmethod
from typing import List

import torch

from shared.lib.detected_variables import VarCandidates


class EmbeddingsModel(ABC):

  @abstractmethod
  def encode(self, queries: List[str]) -> List[List[float]] | torch.Tensor:
    pass


class EmbeddingsStore(ABC):

  @abstractmethod
  def vector_search(self,
                    query_embeddings: List[List[float]] | torch.Tensor,
                    skip_topics: bool = False) -> List[VarCandidates]:
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
    return self.store.vector_search(query_embeddings, skip_topics)
