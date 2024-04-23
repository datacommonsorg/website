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

from nl_server.embeddings import EmbeddingsMatch
from nl_server.embeddings import EmbeddingsResult
from nl_server.embeddings import EmbeddingsStore
from shared.lib.detected_variables import SentenceScore

TABLE_NAME = 'datacommons'

# TODO: Share these with build_embeddings logic.
DCID_COL = 'dcid'
SENTENCE_COL = 'sentence'
DISTANCE_COL = '_distance'


# TODO: Switch to async API for concurrent lookups.
class LanceDBStore(EmbeddingsStore):
  """Manages the embeddings."""

  def __init__(self, lance_db_dir: str) -> None:
    super().__init__(needs_tensor=False)

    self.db = lancedb.connect(lance_db_dir)
    self.table = self.db.open_table(TABLE_NAME)

  def vector_search(self, query_embeddings: List[List[float]],
                    top_k: int) -> List[EmbeddingsResult]:
    results: List[EmbeddingsResult] = []
    for emb in query_embeddings:
      matches: List[EmbeddingsMatch] = []
      candidates = self.table.search(emb).metric('cosine').limit(
          top_k).to_list()
      for c in candidates:
        # We want to return cosine-similarity, but LanceDB
        # returns distance.
        score = 1 - c[DISTANCE_COL]
        dcid = c[DCID_COL]
        sentence = c[SENTENCE_COL]
        matches.append(
            EmbeddingsMatch(sentence=sentence, score=score, vars=[dcid]))
      results.append(matches)

    return results
