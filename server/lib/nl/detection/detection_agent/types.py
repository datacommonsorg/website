from pydantic import BaseModel, ConfigDict, Field, validator
from typing import Optional
from enum import Enum


class Place(BaseModel):
    """Represents a single geographic place."""
    model_config = ConfigDict(extra='ignore') # Helps prevent additionalProperties: false

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


class Indicator(BaseModel):
    """Represents a single indicator key-value pair."""
    model_config = ConfigDict(extra='ignore')
    key: str
    value: str

class AgentDetection(BaseModel):
    """A simplified, structured output from the detection agent."""
    model_config = ConfigDict(extra='ignore') # Helps prevent additionalProperties: false
    indicators: list[Indicator] = Field(default_factory=list)
    places: list[Place] = Field(default_factory=list)
    parent_place: Optional[Place] = None
    child_place_type: Optional[str] = None
    classification: str

    @validator('classification')
    def classification_must_be_valid(cls, v):
        if v not in [member.value for member in ClassificationType]:
            raise ValueError(f"'{v}' is not a valid classification type.")
        return v
