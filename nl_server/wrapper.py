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

_TOPIC_PREFIX = 'dc/topic/'

# Number of matches to find within the SV index.
_NUM_SV_INDEX_MATCHES = 40
# Number of matches to find within the SV index if skipping topics.
# Reason: Since we're going to drop a few candidates at the top,
# try to retrieve more from vector DB.
_NUM_SV_INDEX_MATCHES_WITHOUT_TOPICS = 60


@dataclass
class SentenceScore:
  sentence: str
  score: float

  def to_str(self) -> str:
    return f'{self.sentence} ({round(self.score, 4)})'


# A single match from Embeddings result.
@dataclass
class EmbeddingsMatch:
  # SV / topic DCID
  var: str
  # Best score
  score: float
  # Sentences
  sentences: List[SentenceScore]


# A list of candidates for a given query (vector or string).
@dataclass
class EmbeddingsResult:
  # Ordered list of matches
  matches: List[EmbeddingsMatch]

  def to_dict(self):
    return {
        'SV': [m.var for m in self.matches],
        'CosineScore': [m.score for m in self.matches],
        'SV_to_Sentences': {
            m.var: [s.to_str() for s in m.sentences] for m in self.matches
        }
    }


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
# EmbeddingsResult.
#
class EmbeddingsStore(ABC):

  def __init__(self, needs_tensor=False):
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
  def search_vars(self,
                  queries: List[str],
                  skip_topics: bool = False) -> SearchVarsResult:
    query_embeddings = self.model.encode(queries)

    if self.model.returns_tensor and not self.store.needs_tensor:
      # Convert to List[List[float]]
      query_embeddings = query_embeddings.tolist()
    elif not self.model.returns_tensor and self.store.needs_tensor:
      # Convert to torch.Tensor
      query_embeddings = torch.tensor(query_embeddings, dtype=torch.float)

    top_k = _NUM_SV_INDEX_MATCHES
    if skip_topics:
      top_k = _NUM_SV_INDEX_MATCHES_WITHOUT_TOPICS

    # Call the store.
    results = self.store.vector_search(query_embeddings, top_k)

    if skip_topics:
      for result in results:
        result.matches[:] = filter(
            lambda m: not m.var.startswith(_TOPIC_PREFIX), result.matches)

    # Turn this into a map:
    return {k: v for k, v in zip(queries, results)}
