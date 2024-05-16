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

from nl_server.ranking import RerankingModel
import shared.lib.detected_variables as vars

# Given a list of query <-> candidates pairs as input, returns
# a corresponding list of scores.
RerankCallable = Callable[[List[tuple[str, str]]], List[float]]


def rerank(rerank_model: RerankingModel,
           query2candidates: Dict[str, vars.VarCandidates],
           debug_logs: Dict) -> Dict[str, vars.VarCandidates]:
  # 1. Prepare indexes and inputs

  # List of query-sentence pairs.
  qs_pairs: List[tuple[str, str]] = []
  # Sentence to index into var_candidates.svs.
  query2sentence2idx: Dict[str, Dict[str, int]] = {}
  for query, var_candidates in query2candidates.items():
    sentence2idx = query2sentence2idx.setdefault(query, {})
    for idx, sv in enumerate(var_candidates.svs):
      for s in var_candidates.sv2sentences.get(sv, []):
        if s.sentence not in sentence2idx:
          sentence2idx[s.sentence] = idx
        qs_pairs.append([query, s.sentence])

  # 2. Perform the re-ranking
  scores = rerank_model.predict(qs_pairs)

  # 3. Group Sentence-Score pairs by query.
  query2sentence2score: Dict[str, Dict[str, float]] = {}
  for qs, score in zip(qs_pairs, scores):
    query2sentence2score.setdefault(qs[0], {}).setdefault(qs[1], score)

  # TODO: Consider factoring this into a different function
  query2rerankedcandidates: Dict[str, vars.VarCandidates] = {}
  for query, sentence2score in query2sentence2score.items():
    # 4. Per query, sort the Sentence-Score pairs based on scores.
    reranked_ss_pairs = sorted(sentence2score.items(),
                               key=lambda ss: ss[1],
                               reverse=True)

    # 5. Given sorted Sentence-Score pairs, sort the var_candidates.
    #    Along the way, also put in the rerank-score.
    # NOTE: The earliest ranked sentence determines the order of the SV.
    reranked_var_candidates = vars.VarCandidates(svs=[],
                                                 scores=[],
                                                 sv2sentences={})

    added_idxs = set()
    sentence2idx = query2sentence2idx[query]
    var_candidates = query2candidates[query]
    for sentence, _ in reranked_ss_pairs:
      idx = sentence2idx[sentence]
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
      sentences_with_rerank_score.sort(key=lambda s: s.rerank_score,
                                       reverse=True)
      reranked_var_candidates.sv2sentences[sv] = sentences_with_rerank_score

    query_log = debug_logs.setdefault("reranking", {}).setdefault(query, {})
    query_log['pre_reranking'] = var_candidates.svs
    query_log['post_reranking'] = reranked_var_candidates.svs
    query2rerankedcandidates[query] = reranked_var_candidates

  return query2rerankedcandidates
