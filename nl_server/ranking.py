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
"""Abstract classes for Ranking model."""

from abc import ABC
from abc import abstractmethod
from typing import List


#
# Abstract class for a Reranking model which takes a list of
# sentence pairs and returns a parallel list of scores.
#
class RerankingModel(ABC):

  @abstractmethod
  def predict(self, query_sentence_pairs: List[tuple[str, str]]) -> List[float]:
    pass