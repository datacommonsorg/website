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

from nl_server import wrapper
from nl_server.model import sentence_transformer
from shared.lib import detected_variables as vars

# Number of matches to find within the SV index.
_NUM_SV_INDEX_MATCHES = 40
# Number of matches to find within the SV index if skipping topics.
_NUM_SV_INDEX_MATCHES_WITHOUT_TOPICS = 60

# Prefix string for dcids that are topics
_TOPIC_PREFIX = 'dc/topic/'


class MemoryEmbeddingsStore(wrapper.EmbeddingsStore):
  """Manages the embeddings."""

  def __init__(self, embeddings_path: str) -> None:
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
  def vector_search(self,
                    query_embeddings: List[List[float]],
                    skip_topics: bool = False) -> List[vars.VarCandidates]:
    top_k = _NUM_SV_INDEX_MATCHES
    if skip_topics:
      top_k = _NUM_SV_INDEX_MATCHES_WITHOUT_TOPICS
    hits = semantic_search(query_embeddings,
                           self.dataset_embeddings,
                           top_k=top_k)

    # A map from input query -> SV DCID -> matched sentence -> score for that match
    query_indexed_sv2sentence2score: List[Dict[str, Dict[str, float]]] = []
    # A map from input query -> SV DCID -> highest matched score
    query_indexed_sv2score: List[Dict[str, float]] = []
    for i, hit in enumerate(hits):
      query_indexed_sv2sentence2score.append({})
      query_indexed_sv2score.append({})
      for ent in hit:
        score = ent['score']
        for dcid in self.dcids[ent['corpus_id']].split(','):
          if skip_topics and dcid.startswith(_TOPIC_PREFIX):
            continue
          # Prefer the top score.
          if dcid not in query_indexed_sv2score[i]:
            query_indexed_sv2score[i][dcid] = score
            query_indexed_sv2sentence2score[i][dcid] = {}

          if ent['corpus_id'] >= len(self.sentences):
            continue
          sentence = self.sentences[ent['corpus_id']]
          query_indexed_sv2sentence2score[i][dcid][sentence] = score

    results: List[vars.VarCandidates] = []

    # Go over the map and prepare parallel lists of
    # SVs and scores in query2result.
    for sv2score in query_indexed_sv2score:
      sv2score_sorted = [(k, v) for (
          k,
          v) in sorted(sv2score.items(), key=lambda item: (-item[1], item[0]))]
      svs = [k for (k, _) in sv2score_sorted]
      scores = [v for (_, v) in sv2score_sorted]
      results.append(vars.VarCandidates(svs=svs, scores=scores,
                                        sv2sentences={}))

    # Go over the results and prepare the sv2sentences map in
    # query2result.
    for i, sv2sentence2score in enumerate(query_indexed_sv2sentence2score):
      results[i].sv2sentences = {}
      for sv, sentence2score in sv2sentence2score.items():
        results[i].sv2sentences[sv] = []
        for sentence, score in sorted(sentence2score.items(),
                                      key=lambda item: item[1],
                                      reverse=True):
          score = round(score, 4)
          results[i].sv2sentences[sv].append(sentence + f' ({score})')

    return results
