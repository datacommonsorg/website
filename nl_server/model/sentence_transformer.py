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

from nl_server import config
from nl_server import embeddings


class LocalSentenceTransformerModel(embeddings.EmbeddingsModel):

  def __init__(self, existing_model_path: str = ""):
    super().__init__(returns_tensor=True)

    if existing_model_path:
      logging.info(f'Loading tuned model from: {existing_model_path}')
      self.model = SentenceTransformer(existing_model_path)
    else:
      logging.info(f'Loading base model {config.EMBEDDINGS_BASE_MODEL_NAME}')
      self.model = SentenceTransformer(config.EMBEDDINGS_BASE_MODEL_NAME)

  def encode(self, queries: List[str]) -> torch.Tensor:
    return self.model.encode(queries, show_progress_bar=False)
