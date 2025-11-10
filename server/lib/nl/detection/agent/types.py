# Copyright 2025 Google LLC
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

from enum import Enum
from typing import Optional

from pydantic import BaseModel
from pydantic import Field
from pydantic import validator


class Place(BaseModel):
  """Represents a single geographic place."""
  dcid: str
  name: str
  place_type: Optional[str] = None


class ClassificationType(str, Enum):
  """Represents the type of a query classification."""
  OTHER = "Other"
  SIMPLE = "Simple"
  RANKING = "Ranking"
  QUANTITY = "Quantity"
  CONTAINED_IN = "Contained In"
  CORRELATION = "Correlation"
  COMPARISON = "Comparison"
  TIME_DELTA = "Time Delta"
  EVENT = "Event"
  OVERVIEW = "Overview"
  SUPERLATIVE = "Superlative"
  DATE = "Date"
  ANSWER_PLACES_REFERENCE = "Answer Places Reference"
  PER_CAPITA = "Per Capita"
  DETAILED_ACTION = "Detailed Action"
  TEMPORAL = "Temporal"
  UNKNOWN = "Unknown"


class AgentDetection(BaseModel):
  """A simplified, structured output from the detection agent.

  Note that certain type choices are dictated by what currently works with ADK structured outputs.
  Examples:
  - Optional[Foo] instead of Foo | None
  - strings instead of string enums
  """
  indicators: dict[str, str] = Field(default_factory=dict)
  places: list[Place] = Field(default_factory=list)
  parent_place: Optional[Place] = None
  child_place_type: Optional[str] = None
  classification: str

  @validator('classification')
  def classification_must_be_valid(cls, v):
    if v not in [member.value for member in ClassificationType]:
      raise ValueError(f"'{v}' is not a valid classification type.")
    return v
