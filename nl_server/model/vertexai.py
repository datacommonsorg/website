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
"""Vertex AI Model."""

from typing import List

from google.cloud import aiplatform

from nl_server import embeddings
from nl_server import ranking
from nl_server.config import VertexAIModelConfig


class VertexAIEmbeddingsModel(embeddings.EmbeddingsModel):

  def __init__(self, model_config: VertexAIModelConfig):
    super().__init__(model_config.score_threshold)
    self.prediction_client = _init_client(model_config)

  def encode(self, queries: List[str]) -> List[List[float]]:
    return self.prediction_client.predict(instances=queries).predictions


class VertexAIRerankingModel(ranking.RerankingModel):

  def __init__(self, model_config: VertexAIModelConfig):
    self.prediction_client = _init_client(model_config)

  def predict(self, query_sentence_pairs: List[tuple[str, str]]) -> List[float]:
    return self.prediction_client.predict(
        instances=query_sentence_pairs).predictions


def _init_client(model_config: VertexAIModelConfig):
  aiplatform.init(project=model_config.project_id,
                  location=model_config.location)
  return aiplatform.Endpoint(model_config.prediction_endpoint_id)
