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

import logging
import os
from typing import List

import pandas as pd

from nl_server.config import CUSTOM_DC_INDEX
from nl_server.config import DEFAULT_INDEX_TYPE
from nl_server.config import EmbeddingsIndex
from nl_server.embeddings import Embeddings


#
# A simple wrapper class around multiple embeddings indexes.
#
class Store:

  def __init__(self, indexes: List[EmbeddingsIndex]):
    self.embeddings_map = {}

    # If there is a custom DC index, merge the embeddings into default DC index.
    default_idx, custom_idx = _get_default_and_custom(indexes)
    if custom_idx:
      default_idx.embeddings_local_path = _merge_custom_index(
          default_idx, custom_idx)

    # NOTE: Not excluding CUSTOM_DC_INDEX from the map, so should the
    # custom DC customers want queries to work within their variables
    # they can set `idx=custom`.
    for idx in indexes:
      self.embeddings_map[idx.name] = Embeddings(idx.embeddings_local_path,
                                                 idx.tuned_model_local_path)

  # Note: The caller takes care of exceptions.
  def get(self, index_type: str = DEFAULT_INDEX_TYPE) -> Embeddings:
    return self.embeddings_map.get(index_type)


#
# Helper functions
#


#
# Extract out default and custom index from the list.
#
def _get_default_and_custom(
    indexes: List[EmbeddingsIndex]) -> tuple[EmbeddingsIndex, EmbeddingsIndex]:
  custom_idx: EmbeddingsIndex = None
  default_idx: EmbeddingsIndex = None
  for idx in indexes:
    if idx.name == CUSTOM_DC_INDEX:
      custom_idx = idx
    elif idx.name == DEFAULT_INDEX_TYPE:
      default_idx = idx

  assert default_idx, f'Did not find {DEFAULT_INDEX_TYPE}'
  return default_idx, custom_idx


#
# Maybe merge the custom index into the default index and return
# the updated local path.
#
def _merge_custom_index(default: EmbeddingsIndex,
                        custom: EmbeddingsIndex) -> str:
  assert default.tuned_model == custom.tuned_model, \
    f'Main ({default.tuned_model}) vs. custom ({custom.tuned_model}) not using the same embeddings'

  # /foo/x.csv => /foo/WithCustom_x.csv
  output_embeddings_path = os.path.join(
      os.path.dirname(default.embeddings_local_path),
      'WithCustom_' + os.path.basename(default.embeddings_local_path))

  main_df = pd.read_csv(default.embeddings_local_path)
  custom_df = pd.read_csv(custom.embeddings_local_path)
  assert main_df.columns.equals(custom_df.columns), \
    'Main vs. custom embeddings CSV columns differ!'

  # Set ignore_index to reset index in output
  concat_df = pd.concat([main_df, custom_df], ignore_index=True)
  concat_df.to_csv(output_embeddings_path, index=False)

  logging.info(
      f'Concatenated main {default.embeddings_local_path} with '
      f'custom {custom.embeddings_local_path} into {output_embeddings_path}')

  return output_embeddings_path
