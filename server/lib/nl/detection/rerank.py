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

from typing import Callable, Dict, List

import shared.lib.detected_variables as vars

# Given a list of query <-> candidates pairs as input, returns
# a corresponding list of scores.
RerankCallable = Callable[[List[tuple[str, str]]], List[float]]


def rerank(rerank_fn: RerankCallable, query: str,
           var_candidates: vars.VarCandidates,
           debug_logs: Dict) -> vars.VarCandidates:
  # 1. Prepare indexes and inputs

  # List of query-sentence pairs.
  qs_pairs: List[List[str, str]] = []
  # Sentence to index into var_candidates parallel arrays.
  sentence2idx: Dict[str, int] = {}
  for idx, sv in enumerate(var_candidates.svs):
    for s in var_candidates.sv2sentences.get(sv, []):
      if s.sentence not in sentence2idx:
        sentence2idx[s.sentence] = idx
      qs_pairs.append([query, s.sentence])

  # 2. Perform the re-ranking
  scores = rerank_fn(qs_pairs).predictions

  # 3. Sort the Query-Sentence pairs based on scores.
  sentence2score: Dict[str, float] = {
      qs[1]: s for qs, s in zip(qs_pairs, scores)
  }
  reranked_qs_pairs = sorted(qs_pairs,
                             key=lambda qs: sentence2score[qs[1]],
                             reverse=True)

  # 4. Given sorted Query-Sentence pairs, sort the var_candidates
  # next.  Along the way, also put in the rerank-score.
  # NOTE: The earliest ranked sentence determines the order of the
  # SV.
  reranked_var_candidates = vars.VarCandidates(svs=[],
                                               scores=[],
                                               sv2sentences={})
  added_idxs = set()
  for qs_pair in reranked_qs_pairs:
    idx = sentence2idx[qs_pair[1]]
    if idx in added_idxs:
      # We've already processed the SV.
      continue
    added_idxs.add(idx)

    sv = var_candidates.svs[idx]
    reranked_var_candidates.svs.append(sv)
    reranked_var_candidates.scores.append(var_candidates.scores[idx])
    sentences_with_rerank_score: List[vars.SentenceScore] = []
    for s in var_candidates.sv2sentences[sv]:
      sentences_with_rerank_score.append(
          vars.SentenceScore(sentence=s.sentence,
                             score=s.score,
                             rerank_score=sentence2score[s.sentence]))
    sentences_with_rerank_score.sort(key=lambda s: s.rerank_score, reverse=True)
    reranked_var_candidates.sv2sentences[sv] = sentences_with_rerank_score

  debug_logs['pre_reranking'] = var_candidates.svs
  debug_logs['post_reranking'] = reranked_var_candidates.svs

  return reranked_var_candidates
