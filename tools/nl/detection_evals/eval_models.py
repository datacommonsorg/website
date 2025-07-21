# @title Pydantic Models
import json
from enum import Enum, auto
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from pydantic import (
    BaseModel,
    ConfigDict,
    ValidationError,
    field_serializer,
    model_validator,
)


class Ranking(str, Enum):
    HIGH = "HIGH"
    LOW = "LOW"


class Filter(Enum):
    INCREASING = "INCREASING"
    DECREASING = "DECREASING"


class GoldenType(Enum):
    STABLE = "STABLE"
    ASPIRATIONAL = "ASPIRATIONAL"


class ResponseStatus(Enum):
    OK = "OK"
    ERROR = "ERROR"


class VariableResponse(BaseModel):
    search_label: str
    dcids: List[str]
    per_capita: bool = False
    rank: Optional[Ranking] = None
    filter: Optional[Filter] = None


class DetectedPlace(BaseModel):
    dcid: str
    sub_place_type: Optional[str] = None


class DetectedDate(BaseModel):
    """String formats: YYYY, YYYY-MM, or YYYY-MM-DD"""

    base_date: str
    end_date: Optional[str] = None


class NlQueryResponse(BaseModel):
    id: int
    query: str
    dates: List[DetectedDate]
    places: List[DetectedPlace]
    variables: List[VariableResponse]


class NlGolden(NlQueryResponse):
    golden_type: GoldenType


class NlApiScrape(NlQueryResponse):
    scrape_date: str
    api_response_status: ResponseStatus = ResponseStatus.OK
    api_blocked: bool = False


class EvalMetadata(BaseModel):
    golden_epoch: str
    scrape_epoch: str
    score_epoch: str
    description: Optional[str] = None
    change_log: Optional[str] = None


class NlQueryEvalScore(BaseModel):
    id: int
    query: str
    golden_type: GoldenType
    metadata: EvalMetadata
    golden_response: NlGolden
    scraped_response: NlApiScrape
    date_score: Optional[float] = None
    place_score: Optional[float] = None
    variable_score: Optional[float] = None
    variable_precision: Optional[float] = None
    variable_recall: Optional[float] = None
    total_score: Optional[float] = None

    def model_dump(self, **kwargs) -> dict:
        """Override model_dump to convert np.nan to None in the output."""
        data = super().model_dump(**kwargs)
        return NlQueryEvalScore._clean_nan_values(data)

    @model_validator(mode="before")
    @classmethod
    def validate_nan_values(cls, data: Any) -> Any:
        """
        Pre-process the input data to convert any np.nan values to None
        before the main validation runs.
        """
        return NlQueryEvalScore._clean_nan_values(data)

    @staticmethod
    def _clean_nan_values(data):
        """
        Pre-process the input data to convert any np.nan values to None
        before the main validation runs.
        """
        if isinstance(data, dict):
            for key, value in data.items():
                # This check handles both scalar nan and lists containing nan
                if isinstance(value, (list, np.ndarray)):
                    data[key] = [None if pd.isna(item) else item for item in value]
                elif pd.isna(value):
                    data[key] = None
        return data
