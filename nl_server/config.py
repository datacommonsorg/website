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
from typing import Dict, List

from nl_server import embeddings
from nl_server import gcs

# Index constants.  Passed in `url=`
CUSTOM_DC_INDEX = 'custom'
DEFAULT_INDEX_TYPE = 'medium_ft'

# The default base model we use.
EMBEDDINGS_BASE_MODEL_NAME = 'all-MiniLM-L6-v2'

# App Config constants.
NL_MODEL_KEY = 'NL_MODEL'
NL_EMBEDDINGS_KEY = 'NL_EMBEDDINGS'
NL_EMBEDDINGS_VERSION_KEY = 'NL_EMBEDDINGS_VERSION_MAP'


# Defines one embeddings index config.
@dataclass
class Index:
  # Name provided in the yaml file, and set in `idx=` URL param.
  name: str

  # File name provided in the yaml file.
  embeddings_file_name: str
  # Local path.
  embeddings_local_path: str = ""

  # Fine-tuned model name ("" if embeddings uses base model).
  tuned_model: str = ""
  # Fine-tuned model local path.
  tuned_model_local_path: str = ""


#
# Validates the config input, downloads all the files and returns a list of Indexes to load.
#
def load(embeddings_map: Dict[str, str], models_map: Dict[str,
                                                          str]) -> List[Index]:
  # Create Index objects.
  indexes = _to_indexes(embeddings_map)

  # This is just a sanity, we can soon deprecate models.yaml
  tuned_models_provided = list(set(models_map.values()))
  tuned_models_configured = list(
      set([i.tuned_model for i in indexes if i.tuned_model]))
  assert sorted(tuned_models_configured) == sorted(tuned_models_provided), \
    f'{tuned_models_configured} vs. {tuned_models_provided}'

  #
  # Download all the models.
  #
  model2path = {d: gcs.download_model_folder(d) for d in tuned_models_configured}
  for idx in indexes:
    if idx.tuned_model:
      idx.tuned_model_local_path = model2path[idx.tuned_model]

  #
  # Download all the embeddings.
  #
  for idx in indexes:
    idx.embeddings_local_path = gcs.download_embeddings(
        idx.embeddings_file_name)

  return indexes


def _to_indexes(embeddings_map: Dict[str, str]) -> List[Index]:
  indexes: List[Index] = []

  for key, value in embeddings_map.items():
    parts = value.split('.')
    idx = Index(name=key, embeddings_file_name=value)
    if len(parts) == 4:
      # Expect: <embeddings_version>.<fine-tuned-model-version>.<base-model>.csv
      assert parts[
          2] == EMBEDDINGS_BASE_MODEL_NAME, f'Unexpected base model {parts[3]}'
      idx.tuned_model = f'{parts[1]}.{parts[2]}'
    else:
      # Expect: <embeddings_version>.csv
      assert len(parts) == 2, f'Unexpected file name format {value}'
    assert parts[
        -1] == 'csv', f'Embeddings file {value} name does not end with .csv!'
    indexes.append(idx)

  return indexes
