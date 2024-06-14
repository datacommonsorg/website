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
"""Sentence Transformer Model."""

from typing import List

from sentence_transformers import SentenceTransformer
import torch

from nl_server import embeddings
from nl_server.config import LocalModelConfig
from shared.lib import gcs


class LocalSentenceTransformerModel(embeddings.EmbeddingsModel):

  def __init__(self, model_info: LocalModelConfig):
    super().__init__(model_info.score_threshold, returns_tensor=True)

    # Download model from gcs if there is a gcs folder specified
    model_path = gcs.maybe_download(model_info.gcs_folder,
                                    embeddings.get_download_root(),
                                    use_anonymous_client=True)
    self.model = SentenceTransformer(model_path)

  def encode(self, queries: List[str], show_progress_bar=False) -> torch.Tensor:
    return self.model.encode(queries, show_progress_bar=show_progress_bar)
