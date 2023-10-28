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

from typing import List

from nl_server.config import DEFAULT_INDEX_TYPE
from nl_server.config import EmbeddingsIndex
from nl_server.embeddings import Embeddings


#
# A simple wrapper class around multiple embeddings indexes.
#
# TODO: Handle custom DC specific logic here.
#
class Store:

  def __init__(self, indexes: List[EmbeddingsIndex]):
    self.embeddings_map = {}
    for idx in indexes:
      self.embeddings_map[idx.name] = Embeddings(idx.embeddings_local_path,
                                                 idx.tuned_model_local_path)

  # Note: The caller takes care of exceptions.
  def get(self, index_type: str = DEFAULT_INDEX_TYPE) -> Embeddings:
    return self.embeddings_map[index_type]
