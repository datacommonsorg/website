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
from typing import Dict, List

from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from sentence_transformers.util import semantic_search
import torch

from nl_server import config
from shared.lib import detected_variables as vars

# Number of matches to find within the SV index.
_NUM_SV_INDEX_MATCHES = 40
# Number of matches to find within the SV index if skipping topics.
_NUM_SV_INDEX_MATCHES_WITHOUT_TOPICS = 60

# Prefix string for dcids that are topics
_TOPIC_PREFIX = 'dc/topic/'


def load_model(existing_model_path: str = ""):
  if existing_model_path:
    logging.info(f'Loading tuned model from: {existing_model_path}')
    return SentenceTransformer(existing_model_path)
  logging.info(f'Loading base model {config.EMBEDDINGS_BASE_MODEL_NAME}')
  return SentenceTransformer(config.EMBEDDINGS_BASE_MODEL_NAME)


class Embeddings:
  """Manages the embeddings."""

  def __init__(self, embeddings_path: str, model: any) -> None:
    self.model = model
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
  # Given a list of queries, searches the in-memory embeddings index
  # and returns a map of candidates keyed by input queries.
  #
  def search_vars(self,
                  queries: List[str],
                  skip_topics: bool = False) -> Dict[str, vars.VarCandidates]:
    query_embeddings = self.model.encode(queries, show_progress_bar=False)
    top_k = _NUM_SV_INDEX_MATCHES
    if skip_topics:
      top_k = _NUM_SV_INDEX_MATCHES_WITHOUT_TOPICS
    hits = semantic_search(query_embeddings,
                           self.dataset_embeddings,
                           top_k=top_k)

    # A map from input query -> SV DCID -> matched sentence -> score for that match
    query2sv2sentence2score: Dict[str, Dict[str, Dict[str, float]]] = {}
    # A map from input query -> SV DCID -> highest matched score
    query2sv2score: Dict[str, Dict[str, float]] = {}
    for i, hit in enumerate(hits):
      q = queries[i]
      query2sv2score[q] = {}
      query2sv2sentence2score[q] = {}
      for ent in hit:
        score = ent['score']
        for dcid in self.dcids[ent['corpus_id']].split(','):
          if skip_topics and dcid.startswith(_TOPIC_PREFIX):
            continue
          # Prefer the top score.
          if dcid not in query2sv2score[q]:
            query2sv2score[q][dcid] = score
            query2sv2sentence2score[q][dcid] = {}

          if ent['corpus_id'] >= len(self.sentences):
            continue
          sentence = self.sentences[ent['corpus_id']]
          query2sv2sentence2score[q][dcid][sentence] = score

    query2result: Dict[str, vars.VarCandidates] = {}

    # Go over the map and prepare parallel lists of
    # SVs and scores in query2result.
    for q, sv2score in query2sv2score.items():
      sv2score_sorted = [(k, v) for (
          k,
          v) in sorted(sv2score.items(), key=lambda item: (-item[1], item[0]))]
      svs = [k for (k, _) in sv2score_sorted]
      scores = [v for (_, v) in sv2score_sorted]
      query2result[q] = vars.VarCandidates(svs=svs,
                                           scores=scores,
                                           sv2sentences={})

    # Go over the results and prepare the sv2sentences map in
    # query2result.
    for q, sv2sentence2score in query2sv2sentence2score.items():
      query2result[q].sv2sentences = {}
      for sv, sentence2score in sv2sentence2score.items():
        query2result[q].sv2sentences[sv] = []
        for sentence, score in sorted(sentence2score.items(),
                                      key=lambda item: item[1],
                                      reverse=True):
          score = round(score, 4)
          query2result[q].sv2sentences[sv].append(sentence + f' ({score})')

    json_result = {}
    for q, result in query2result.items():
      json_result[q] = {
          'SV': result.svs,
          'CosineScore': result.scores,
          'SV_to_Sentences': result.sv2sentences
      }
    return json_result
