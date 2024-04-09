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

from typing import Dict, List

import lancedb

from nl_server import wrapper
from shared.lib import detected_variables as vars

TABLE_NAME = 'datacommons'


class LanceDBStore(wrapper.EmbeddingsStore):
  """Manages the embeddings."""

  def __init__(self, lance_db_dir: str) -> None:
    super().__init__(needs_tensor=False)

    self.db = lancedb.connect(lance_db_dir)
    self.table = self.db.open_table(TABLE_NAME)

  def vector_search(self, query_embeddings: List[List[float]],
                    top_k: int) -> List[wrapper.VarCandidates]:
    results: List[vars.VarCandidates] = []
    for emb in query_embeddings:
      sv2score: Dict[str, float] = {}
      sv2sentence2score: Dict[str, Dict[str, float]] = {}

      matches = self.table.search(emb).metric('cosine').limit(top_k).to_list()
      for match in matches:
        # We want to return cosine-similarity, but LanceDB
        # returns distance.
        score = 1 - match['_distance']
        dcid = match['dcid']
        sentence = match['sentence']
        if dcid not in sv2score:
          sv2score[dcid] = score
          sv2sentence2score[dcid] = {}
        sv2sentence2score[dcid][sentence] = score

      result = vars.VarCandidates(svs=[], scores=[], sv2sentences={})
      for sv, score in sorted(sv2score.items(),
                              key=lambda item: (-item[1], item[0])):
        result.svs.append(sv)
        result.scores.append(score)
        result.sv2sentences[sv] = []
        for sentence, score in sorted(sv2sentence2score.get(sv, []).items(),
                                      key=lambda item: item[1],
                                      reverse=True):
          score = round(score, 4)
          result.sv2sentences[sv].append(f'{sentence} ({score})')

      results.append(result)

    return results
