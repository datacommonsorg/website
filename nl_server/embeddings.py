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
"""Managing the embeddings."""
import logging
import os
from typing import Dict, List, Union

from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from sentence_transformers.util import semantic_search
import torch

import nl_server.gcs as gcs

MODEL_NAME = 'all-MiniLM-L6-v2'


class Embeddings:
  """Manages the embeddings."""

  def __init__(self, embeddings_file: str) -> None:
    self.model = SentenceTransformer(MODEL_NAME)
    self.dataset_embeddings: torch.Tensor = None
    self.dcids: List[str] = []
    self.sentences: List[str] = []
    downloaded_file = gcs.download(embeddings_file)

    logging.info('Loading embeddings file')
    try:
      ds = load_dataset('csv', data_files=downloaded_file)
    except:
      error_str = "No embedding could be loaded."
      logging.error(error_str)
      raise Exception("No embedding could be loaded.")

    self.df = ds["train"].to_pandas()
    self.dcids = self.df['dcid'].values.tolist()
    self.df = self.df.drop('dcid', axis=1)
    # Also get the sentence mappings.
    self.sentences = []
    if 'sentence' in self.df:
      self.sentences = self.df['sentence'].values.tolist()
      self.df = self.df.drop('sentence', axis=1)

    self.dataset_embeddings = torch.from_numpy(self.df.to_numpy()).to(
        torch.float)

  def get_embedding_at_index(self, index: int) -> List[float]:
    if index < 0 or index >= len(self.df):
      logging.error(
          f"get_embedding_at_index() got an index out of range. index = {index}. len(df) = {len(self.df)}"
      )
      return []

    return self.df.iloc[index].values.tolist()

  def get_embedding(self, query: str) -> List[float]:
    return self.model.encode(query).tolist()

  def detect_svs(self, query: str) -> Dict[str, Union[Dict, List]]:
    query_embeddings = self.model.encode([query])
    hits = semantic_search(query_embeddings, self.dataset_embeddings, top_k=20)

    # Note: multiple results may map to the same DCID. As well, the same string may
    # map to multiple DCIDs with the same score.
    sv2score = {}
    # Also track the sv to index so that embeddings can later be retrieved.
    sv2index = {}
    # Also add the full list of SVs and sentences that matched (for debugging).
    all_svs_sentences: Dict[str, List[str]] = {}
    for e in hits[0]:
      for d in self.dcids[e['corpus_id']].split(','):
        s = e['score']
        ind = e['corpus_id']
        sentence = ""
        try:
          sentence = self.sentences[e['corpus_id']] + f" ({s})"
        except Exception as exp:
          logging.info(exp)
        # Prefer the top score.
        if d not in sv2score:
          sv2score[d] = s
          sv2index[d] = ind

        # Add to the debug map anyway.
        existing_sentences = []
        if d in all_svs_sentences:
          existing_sentences = all_svs_sentences[d]

        if sentence not in existing_sentences:
          existing_sentences.append(sentence)
          all_svs_sentences[d] = existing_sentences

    # Sort by scores
    sv2score_sorted = sorted(sv2score.items(),
                             key=lambda item: item[1],
                             reverse=True)
    svs_sorted = [k for (k, _) in sv2score_sorted]
    scores_sorted = [v for (_, v) in sv2score_sorted]

    sv_index_sorted = [sv2index[k] for (k, _) in sv2score_sorted]

    return {
        'SV': svs_sorted,
        'CosineScore': scores_sorted,
        'EmbeddingIndex': sv_index_sorted,
        'SV_to_Sentences': all_svs_sentences,
    }
