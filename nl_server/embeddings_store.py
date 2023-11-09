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

import dataclasses
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
    self.embeddings_map: dict[str, Embeddings] = {}

    # If there is a custom DC index, merge the embeddings into default DC index.
    default_idx, custom_idx = _get_default_and_custom(indexes)

    # If a new custom index is loaded after startup, it will be merged with the
    # original default index maintained under this variable.
    self.original_default_idx = dataclasses.replace(default_idx)

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

  def merge_custom_index(self, custom_idx: EmbeddingsIndex):
    """Merges the specified custom index with the default index.

    This method will be called if a new custom index is loaded at runtime
    via the /api/load/ call.
    """
    default_idx = dataclasses.replace(self.original_default_idx)
    default_idx.embeddings_local_path = _merge_custom_index(
        default_idx, custom_idx)
    self.embeddings_map.update({
        custom_idx.name:
            Embeddings(custom_idx.embeddings_local_path,
                       custom_idx.tuned_model_local_path),
        default_idx.name:
            Embeddings(default_idx.embeddings_local_path,
                       default_idx.tuned_model_local_path)
    })


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
  # If model version is encoded in the embeddings file name, it should match the default model.
  # If none is encoded, tuned_model will be falsy and assumed to have used the same version.
  assert not custom.tuned_model or default.tuned_model == custom.tuned_model, \
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
