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

import csv
import logging
from typing import List

from datasets import load_dataset
from sentence_transformers.util import semantic_search
import torch

from nl_server.cache import get_cache_root
from nl_server.config import MemoryIndexConfig
from nl_server.embeddings import EmbeddingsMatch
from nl_server.embeddings import EmbeddingsResult
from nl_server.embeddings import EmbeddingsStore
from nl_server.embeddings import NoEmbeddingsException
from shared.lib.custom_dc_util import use_anonymous_gcs_client
from shared.lib.gcs import is_gcs_path
from shared.lib.gcs import maybe_download


class MemoryEmbeddingsStore(EmbeddingsStore):
  """Manages the embeddings."""

  def __init__(self, idx_info: MemoryIndexConfig) -> None:
    super().__init__(healthcheck_query=idx_info.healthcheck_query,
                     needs_tensor=True)

    if idx_info.embeddings_path.startswith('/'):
      embeddings_path = idx_info.embeddings_path
    elif is_gcs_path(idx_info.embeddings_path):
      embeddings_path = maybe_download(
          gcs_path=idx_info.embeddings_path,
          local_path_root=get_cache_root(),
          use_anonymous_client=use_anonymous_gcs_client())
      if not embeddings_path:
        raise AssertionError(
            f'Embeddings not downloaded from GCS. Please check the path: {idx_info.embeddings_path}'
        )
    else:
      raise AssertionError(
          f'"embeddings_path" path must start with `/` or `gs://`: {idx_info.embeddings_path}'
      )

    # Raise no embeddings exception if the embeddings path does not have any embeddings.
    if _is_csv_empty_or_header_only(embeddings_path):
      logging.info(f'Empty file from {embeddings_path}')
      raise NoEmbeddingsException()

    self.dataset_embeddings: torch.Tensor = None
    self.dcids: List[str] = []
    self.sentences: List[str] = []

    logging.info('Loading embeddings file: %s', embeddings_path)
    try:
      ds = load_dataset('csv', data_files=embeddings_path)
    except Exception as e:
      error_str = f'No embedding could be loaded for {embeddings_path}: {e}'
      logging.error(error_str)
      raise Exception(error_str)

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
    results: List[EmbeddingsResult] = []
    for hit in hits:
      matches: List[EmbeddingsMatch] = []
      for ent in hit:
        score = ent['score']
        vars = self.dcids[ent['corpus_id']].split(';')
        sentence = ''
        if ent['corpus_id'] < len(self.sentences):
          sentence = self.sentences[ent['corpus_id']]
        matches.append(
            EmbeddingsMatch(score=score, vars=vars, sentence=sentence))
      results.append(matches)

    return results


def _is_csv_empty_or_header_only(file_path):
  """
  Checks if a CSV file is empty or only contains the header row.

  Args:
    file_path: The path to the CSV file.

  Returns:
    True if the CSV file is empty or has only the header, False otherwise.
  """
  with open(file_path, 'r', newline='') as csvfile:
    reader = csv.reader(csvfile)
    logging.error(f'reading {file_path}')
    num_rows = len(list(reader))
    logging.error(f'has {num_rows} rows')
    if num_rows > 1:
      return False
    return True
    try:
      # Read the first row (header)
      logging.error("reading first line")
      first_row = next(reader)
      logging.error(first_row)
      # Try reading the second row
      logging.error("reading second line")
      second_row = next(reader)
      logging.error(second_row)
      # If no exception is raised, there are more rows than just the header
      return False
    except StopIteration:
      # Try reading the second row
      logging.error("in stop iteration")
      # StopIteration is raised if there are no more rows to read
      return True
