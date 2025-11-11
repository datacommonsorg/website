# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from abc import ABC, abstractmethod
from typing import List, Dict, Any

# =========================================
# 1. Abstract Base Strategy
# =========================================
class LLMProvider(ABC):
    """
    Abstract base class defining the required behaviors for any LLM provider
    plugged into our Fact Checker.
    """
    
    model_name: str
    
    @abstractmethod
    def extract_statistics(self, user_query: str) -> List[Dict[str, Any]]:
        """Generates an answer and extracts statistical claims as standard JSON."""
        pass