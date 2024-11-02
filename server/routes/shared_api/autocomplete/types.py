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
"""
AutoComplete API dataclass types
"""

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class ScoredPrediction:
  """Data type for a prediction with its score."""
  description: str
  place_id: Optional[str]
  place_dcid: Optional[str]
  matched_query: str
  score: float


@dataclass
class AutoCompleteResult:
  """Data type for an auto complete result."""
  name: str
  match_type: str
  matched_query: str
  dcid: str


@dataclass
class AutoCompleteApiResponse:
  """Response format for an autocomplete request"""
  predictions: List[AutoCompleteResult]
