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

# Pydantic Models for NL detection evals
#
# To use in colab, use the following two lines of code:
# !wget https://raw.githubusercontent.com/datacommonsorg/website/master/tools/nl/detection_evals/eval_models.py
# from eval_models import *

from enum import Enum
from typing import Any, List, Optional

import numpy as np
import pandas as pd
from pydantic import (
    BaseModel,
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
