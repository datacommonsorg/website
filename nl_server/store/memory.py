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
"""In-memory Embeddings store."""

import logging
from typing import Dict, List

from datasets import load_dataset
from sentence_transformers.util import semantic_search
import torch

from nl_server.embeddings import EmbeddingsMatch
from nl_server.embeddings import EmbeddingsResult
from nl_server.embeddings import EmbeddingsStore
from shared.lib.detected_variables import SentenceScore


class MemoryEmbeddingsStore(EmbeddingsStore):
  """Manages the embeddings."""

  def __init__(self, embeddings_path: str) -> None:
    super().__init__(needs_tensor=True)

    self.dataset_embeddings: torch.Tensor = None
    self.dcids: List[str] = []
    self.sentences: List[str] = []

    logging.info('Loading embeddings file: %s', embeddings_path)
    try:
      ds = load_dataset('csv', data_files=embeddings_path)
    except:
      error_str = "No embedding could be loaded."
      logging.error(error_str)
      raise Exception("No embedding could be loaded.")

    df = ds["train"].to_pandas()
    self.dcids = df['dcid'].values.tolist()
    df = df.drop('dcid', axis=1)
    # Also get the sentence mappings.
    self.sentences = []
    if 'sentence' in df:
      self.sentences = df['sentence'].values.tolist()
      df = df.drop('sentence', axis=1)

    self.dataset_embeddings = torch.from_numpy(df.to_numpy()).to(torch.float)

  #
  # Given a list of query embeddings, searches the in-memory embeddings index
  # and returns a list of candidates in the same order as original queries.
  #
  def vector_search(self, query_embeddings: torch.Tensor,
                    top_k: int) -> List[EmbeddingsResult]:
    hits = semantic_search(query_embeddings,
                           self.dataset_embeddings,
                           top_k=top_k)

    # List of results per input query, with each entry being a map
    # keyed by DCID.
    query_indexed_results: List[Dict[str, EmbeddingsMatch]] = []
    for i, hit in enumerate(hits):
      query_indexed_results.append({})
      for ent in hit:
        score = ent['score']
        for dcid in self.dcids[ent['corpus_id']].split(','):
          # Prefer the top score.
          if dcid not in query_indexed_results[i]:
            query_indexed_results[i][dcid] = EmbeddingsMatch(var=dcid,
                                                             score=score,
                                                             sentences=[])
          if ent['corpus_id'] >= len(self.sentences):
            continue
          sentence = self.sentences[ent['corpus_id']]
          query_indexed_results[i][dcid].sentences.append(
              SentenceScore(sentence=sentence, score=score))

    results: List[EmbeddingsResult] = []
    for sv2match in query_indexed_results:
      matches_sorted = [
          m for _, m in sorted(sv2match.items(),
                               key=lambda item: (-item[1].score, item[0]))
      ]
      # Sort the sentences within each match.
      for m in matches_sorted:
        m.sentences.sort(key=lambda item: item.score, reverse=True)
      results.append(EmbeddingsResult(matches=matches_sorted))

    return results
