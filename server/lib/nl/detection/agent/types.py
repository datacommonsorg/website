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
  """A simplified, structured output from the detection agent."""
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
