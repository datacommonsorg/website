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
"""Library that exposes search_vars"""

import time
from typing import Dict, List

from nl_server import ranking
from nl_server import rerank
from nl_server.embeddings import Embeddings
from nl_server.embeddings import EmbeddingsResult
from nl_server.merge import merge_search_results
import shared.lib.detected_variables as dvars

_TOPIC_PREFIX = 'dc/topic/'

# Number of matches to find within the SV index.
_NUM_SV_INDEX_MATCHES = 40
# Number of matches to find within the SV index if skipping topics.
# Reason: Since we're going to drop a few candidates at the top,
# try to retrieve more from vector DB.
_NUM_SV_INDEX_MATCHES_WITHOUT_TOPICS = 60


#
# Given a list of query embeddings, searches the embeddings index
# and returns a list of candidates in the same order as original queries.
#
def search_vars(embeddings_list: List[Embeddings],
                queries: List[str],
                skip_topics: bool = False,
                rerank_model: ranking.RerankingModel = None,
                debug_logs: dict = {}) -> Dict[str, dvars.VarCandidates]:
  if not embeddings_list:
    return {}

  topk = _get_topk(skip_topics)

  # Call vector search for each index.
  query2candidates_list: List[EmbeddingsResult] = []
  for embeddings in embeddings_list:
    query2candidates_list.append(embeddings.vector_search(queries, topk))

  # Merge the results.
  query2candidates = merge_search_results(query2candidates_list)

  # Rank merged results by vars.
  results: Dict[str, dvars.VarCandidates] = {}
  for query, candidates in query2candidates.items():
    results[query] = _rank_vars(candidates, skip_topics)

  if rerank_model:
    start = time.time()
    results = rerank.rerank(rerank_model, results, debug_logs)
    debug_logs['time_var_reranking'] = time.time() - start

  return results


def _rank_vars(candidates: EmbeddingsResult,
               skip_topics: bool) -> dvars.VarCandidates:
  sv2score = {}
  result = dvars.VarCandidates(svs=[], scores=[], sv2sentences={})
  # SV => set of sentences; for detecting sentence duplicates.
  sv2sentences = {}
  for c in candidates:
    for dcid in c.vars:
      if skip_topics and dcid.startswith(_TOPIC_PREFIX):
        continue
      # Prefer the top score (`candidates` is ordered!)
      if dcid not in sv2score:
        sv2score[dcid] = c.score
        result.sv2sentences[dcid] = []
        sv2sentences[dcid] = set()
      if c.sentence and c.sentence not in sv2sentences[dcid]:
        result.sv2sentences[dcid].append(
            dvars.SentenceScore(sentence=c.sentence, score=c.score))
        sv2sentences[dcid].add(c.sentence)

  # TODO: truncate the score based on model parameters from yaml
  # Same model would produce different scores after certain decimals, so we want
  # to round to 6 decimal places to make the score and rank stable.
  sorted_score = sorted(sv2score.items(),
                        key=lambda item: (-round(item[1], 6), item[0]))
  for sv, score in sorted_score:
    result.svs.append(sv)
    result.scores.append(score)

  return result


def _get_topk(skip_topics: bool) -> int:
  if skip_topics:
    return _NUM_SV_INDEX_MATCHES_WITHOUT_TOPICS
  return _NUM_SV_INDEX_MATCHES
