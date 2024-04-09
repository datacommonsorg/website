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

from dataclasses import dataclass
from enum import Enum
import logging
import os
from typing import Dict, List

from nl_server import gcs
from shared.lib.gcs import download_gcs_file
from shared.lib.gcs import is_gcs_path

# Index constants.  Passed in `url=`
CUSTOM_DC_INDEX: str = 'custom_ft'
DEFAULT_INDEX_TYPE: str = 'medium_ft'

# The default base model we use.
EMBEDDINGS_BASE_MODEL_NAME: str = 'all-MiniLM-L6-v2'

# App Config constants.
NL_MODEL_KEY: str = 'NL_MODEL'
NL_EMBEDDINGS_KEY: str = 'NL_EMBEDDINGS'
NL_EMBEDDINGS_VERSION_KEY: str = 'NL_EMBEDDINGS_VERSION_MAP'


class StoreType(str, Enum):
  MEMORY = 'MEMORY'
  LANCEDB = 'LANCEDB'


# Defines one embeddings index config.
@dataclass
class EmbeddingsIndex:
  # Name provided in the yaml file, and set in `idx=` URL param.
  name: str

  # Values are: MEMORY, LANCEDB
  store_type: StoreType

  # File name provided in the yaml file.
  embeddings_path: str
  # Local path.
  embeddings_local_path: str

  # Fine-tuned model name ("" if embeddings uses base model).
  tuned_model: str = ""
  # Fine-tuned model local path.
  tuned_model_local_path: str = ""


#
# Validates the config input, downloads all the files and returns a list of Indexes to load.
#
def load(embeddings_map: Dict[str, Dict[str, str]]) -> List[EmbeddingsIndex]:
  # Create Index objects.
  indexes = parse(embeddings_map)

  #
  # Download all the models.
  #
  models_set = set([i.tuned_model for i in indexes if i.tuned_model])
  model2path = {d: gcs.download_folder(d) for d in models_set}
  for idx in indexes:
    if idx.tuned_model:
      idx.tuned_model_local_path = model2path[idx.tuned_model]

  #
  # Download all the embeddings.
  #
  for idx in indexes:
    if not idx.embeddings_local_path:
      if idx.store_type == StoreType.MEMORY:
        idx.embeddings_local_path = gcs.download_embeddings(idx.embeddings_path)
      elif idx.store_type == StoreType.LANCEDB:
        idx.embeddings_local_path = gcs.download_folder(idx.embeddings_path)
  return indexes


def parse(embeddings_map: Dict[str, Dict[str, str]]) -> List[EmbeddingsIndex]:
  indexes: List[EmbeddingsIndex] = []

  for key, value_map in embeddings_map.items():
    # Let this fail if the enum isn't valid.
    store_type = StoreType(value_map['store'])
    path = value_map['embeddings']
    model_name = value_map['model']

    if path.startswith('/'):
      # Value is an absolute path
      file_name = os.path.basename(path)
      local_path = path
    elif is_gcs_path(path):
      logging.info('Downloading embeddings from GCS path: %s', path)
      if store_type == StoreType.MEMORY:
        local_path = download_gcs_file(path)
      elif store_type == StoreType.LANCEDB:
        local_path = gcs.download_folder(path)
      if not local_path:
        logging.warning(
            'Embeddings not downloaded from GCS and will be ignored. Please check the path: %s',
            path)
        continue
      file_name = path
    else:
      file_name = path
      local_path = ''

    idx = EmbeddingsIndex(name=key,
                          store_type=store_type,
                          embeddings_path=file_name,
                          embeddings_local_path=local_path,
                          tuned_model=model_name)
    indexes.append(idx)

  return indexes
