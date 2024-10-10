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

from nl_server.config import ModelConfig
from nl_server.config import ModelType
from nl_server.config import ModelUsage
from nl_server.embeddings import EmbeddingsModel
from nl_server.model.sentence_transformer import LocalSentenceTransformerModel
from nl_server.model.vertexai import VertexAIEmbeddingsModel
from nl_server.model.vertexai import VertexAIRerankingModel


def create_embeddings_model(model_config: ModelConfig) -> EmbeddingsModel:
  if model_config.type == ModelType.VERTEXAI:
    if model_config.usage == ModelUsage.EMBEDDINGS:
      return VertexAIEmbeddingsModel(model_config)
    elif model_config.usage == ModelUsage.RERANKING:
      return VertexAIRerankingModel(model_config)
  elif model_config.type == ModelType.LOCAL:
    return LocalSentenceTransformerModel(model_config)
  raise ValueError(f'Unknown model type: {model_config.type}')
