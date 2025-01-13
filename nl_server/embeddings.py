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
from dataclasses import dataclass
from typing import Dict, List

import torch


# A single match from Embeddings result.
@dataclass
class EmbeddingsMatch:
  # The sentence that was matched
  sentence: str
  # Score of the sentence
  score: float
  # One (very rarely more) variable dcids
  vars: List[str]


# Ordered list of matches.
EmbeddingsResult = List[EmbeddingsMatch]


#
# Abstract class for an Embeddings model which takes a list of
# sentences and returns either a list of vectors or a 2d Tensor.
#
class EmbeddingsModel(ABC):

  def __init__(self, score_threshold: float, returns_tensor: bool = False):
    self.score_threshold = score_threshold
    self.returns_tensor = returns_tensor

  @abstractmethod
  def encode(self, queries: List[str]) -> List[List[float]] | torch.Tensor:
    pass


#
# Abstract class for an Embeddings store which takes a list of
# vectors or a 2d Tensor, and returns a corresponding list of
# EmbeddingsResult.
#
class EmbeddingsStore(ABC):

  def __init__(self, healthcheck_query: str, needs_tensor=False):
    self.healthcheck_query = healthcheck_query
    self.needs_tensor = needs_tensor

  @abstractmethod
  def vector_search(self, query_embeddings: List[List[float]] | torch.Tensor,
                    top_k: int) -> List[EmbeddingsResult]:
    pass


# Search result keyed by query.
SearchVarsResult = Dict[str, EmbeddingsResult]


# A simple wrapper around EmbeddingsModel + EmbeddingsStore.
class Embeddings:

  def __init__(self, model: EmbeddingsModel, store: EmbeddingsStore):
    self.model: EmbeddingsModel = model
    self.store: EmbeddingsStore = store

  # Given a list of queries, returns
  def vector_search(self, queries: List[str], top_k: int) -> SearchVarsResult:
    query_embeddings = self.model.encode(queries)

    if self.model.returns_tensor and not self.store.needs_tensor:
      # Convert to List[List[float]]
      query_embeddings = query_embeddings.tolist()
    elif not self.model.returns_tensor and self.store.needs_tensor:
      # Convert to torch.Tensor
      query_embeddings = torch.tensor(query_embeddings, dtype=torch.float)

    # Call the store.
    results = self.store.vector_search(query_embeddings, top_k)

    # Turn this into a map:
    return {k: v for k, v in zip(queries, results)}


class NoEmbeddingsException(Exception):
  """Custom exception raised when no embeddings are found in the embeddings csv."""
  pass
