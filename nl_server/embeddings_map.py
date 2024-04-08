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

import copy
import logging
import os
import shutil
from typing import Dict, List

import pandas as pd

from nl_server.config import CUSTOM_DC_INDEX
from nl_server.config import DEFAULT_INDEX_TYPE
from nl_server.config import EmbeddingsIndex
from nl_server.model.sentence_transformer import SentenceTransformerModel
from nl_server.store.memory import MemoryEmbeddingsStore
from nl_server.wrapper import Embeddings
from nl_server.wrapper import EmbeddingsModel


#
# A map from specific index to embeddings stores and models.
#
class EmbeddingsMap:

  def __init__(self, indexes: List[EmbeddingsIndex]):
    self.embeddings_map: dict[str, Embeddings] = {}

    # If there is a custom DC index, merge the embeddings into default DC index.
    default_idx, custom_idx = _get_default_and_custom(indexes)

    # If a new custom index is loaded after startup, it will be merged with the
    # original default index maintained under this variable.
    self.original_default_idx = copy.deepcopy(default_idx)

    if custom_idx:
      default_idx.embeddings_local_path = _merge_custom_index(
          default_idx, custom_idx)

    # Pre-load models once.
    self.name2model: Dict[str, EmbeddingsModel] = {}
    model2path = {
        idx.tuned_model: idx.tuned_model_local_path for idx in indexes
    }
    for model_name, model_path in model2path.items():
      self.name2model[model_name] = SentenceTransformerModel(model_path)

    # NOTE: Not excluding CUSTOM_DC_INDEX from the map, so should the
    # custom DC customers want queries to work within their variables
    # they can set `idx=custom`.
    for idx in indexes:
      self.embeddings_map[idx.name] = Embeddings(
          model=self.name2model[idx.tuned_model],
          store=MemoryEmbeddingsStore(idx.embeddings_local_path))

  # Note: The caller takes care of exceptions.
  def get(self, index_type: str = DEFAULT_INDEX_TYPE) -> Embeddings:
    return self.embeddings_map.get(index_type)

  def merge_custom_index(self, custom_idx: EmbeddingsIndex):
    """Merges the specified custom index with the default index.

    This method will be called if a new custom index is loaded at runtime
    via the /api/load/ call.
    """
    default_idx = copy.deepcopy(self.original_default_idx)
    default_idx.embeddings_local_path = _merge_custom_index(
        default_idx, custom_idx)

    if custom_idx.tuned_model not in self.name2model:
      self.name2model[custom_idx.tuned_model] = \
        SentenceTransformerModel(custom_idx.tuned_model_local_path)

    self.embeddings_map.update({
        custom_idx.name:
            Embeddings(model=self.name2model[custom_idx.tuned_model],
                       store=MemoryEmbeddingsStore(
                           custom_idx.embeddings_local_path)),
        default_idx.name:
            Embeddings(model=self.name2model[default_idx.tuned_model],
                       store=MemoryEmbeddingsStore(
                           default_idx.embeddings_local_path)),
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
  # If none is encoded, tuned_model will be false and assumed to have used the same version.
  assert not custom.tuned_model or default.tuned_model == custom.tuned_model, \
    f'Main ({default.tuned_model}) vs. custom ({custom.tuned_model}) not using the same embeddings'

  # /foo/x.csv => /foo/WithCustom_x.csv
  output_embeddings_path = os.path.join(
      os.path.dirname(default.embeddings_local_path),
      'WithCustom_' + os.path.basename(default.embeddings_local_path))

  # We merge by first doing a file copy of the main embeddings (vs loading to a dataframe)
  # followed by loading custom DC embeddings to a dataframe and appending them.
  # This significantly reduces the merge time (from 7-10 seconds to 150-200 ms).

  # First copy default embeddings to output file.
  shutil.copy(default.embeddings_local_path, output_embeddings_path)
  # Load custom embeddings into a dataframe
  custom_df = pd.read_csv(custom.embeddings_local_path)
  # Append custom embeddings to output file.
  with open(output_embeddings_path, "a") as out:
    # Custom embeddings csv have a header row
    # which needs to be removed when appending it.
    out.write(custom_df.to_csv(header=None, index=False))

  logging.info(
      f'Concatenated main {default.embeddings_local_path} with '
      f'custom {custom.embeddings_local_path} into {output_embeddings_path}')

  return output_embeddings_path
