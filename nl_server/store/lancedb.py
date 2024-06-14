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
"""LanceDB Embeddings store."""

import logging
from typing import List

import lancedb

from nl_server.cache import get_cache_root
from nl_server.config import LanceDBIndexConfig
from nl_server.embeddings import EmbeddingsMatch
from nl_server.embeddings import EmbeddingsResult
from nl_server.embeddings import EmbeddingsStore
from shared.lib import gcs

TABLE_NAME = 'datacommons'

# TODO: Share these with build_embeddings logic.
DCID_COL = 'dcid'
SENTENCE_COL = 'sentence'
DISTANCE_COL = '_distance'


# TODO: Switch to async API for concurrent lookups.
class LanceDBStore(EmbeddingsStore):
  """Manages the embeddings."""

  def __init__(self, idx_info: LanceDBIndexConfig) -> None:
    super().__init__(healthcheck_query=idx_info.healthcheck_query,
                     needs_tensor=False)

    if idx_info.embeddings_path.startswith('/'):
      lance_db_dir = idx_info.embeddings_path
    elif gcs.is_gcs_path(idx_info.embeddings_path):
      lance_db_dir = gcs.maybe_download(idx_info.embeddings_path,
                                        get_cache_root())
      if not lance_db_dir:
        raise AssertionError(
            f'Embeddings not downloaded from GCS. Please check the path: {idx_info.embeddings_path}'
        )
    else:
      raise AssertionError(
          f'"embeddings_path" path must start with `/` or `gs://`: {idx_info.embeddings_path}'
      )

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
