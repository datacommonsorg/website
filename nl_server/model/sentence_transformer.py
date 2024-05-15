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

import logging
from typing import List

from sentence_transformers import SentenceTransformer
import torch

from nl_server import embeddings
from nl_server import gcs
from nl_server.config import LocalModelConfig


class LocalSentenceTransformerModel(embeddings.EmbeddingsModel):

  def __init__(self, model_info: LocalModelConfig):
    super().__init__(model_info.score_threshold, returns_tensor=True)

    # Download model from gcs if there is a gcs folder specified
    logging.info(f'Downloading tuned model from: {model_info.gcs_folder}')
    model_path = gcs.download_folder(model_info.gcs_folder)
    logging.info(f'Loading tuned model from: {model_path}')
    self.model = SentenceTransformer(model_path)

  def encode(self, queries: List[str]) -> torch.Tensor:
    return self.model.encode(queries, show_progress_bar=False)
