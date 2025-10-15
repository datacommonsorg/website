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

from abc import ABC
import ast
from dataclasses import dataclass
from datetime import date as dt_date
from datetime import datetime
from typing import List, Optional, Tuple

from dateutil.relativedelta import relativedelta
from eval_models import DetectedDate
from eval_models import DetectedPlace
from eval_models import GoldenType
from eval_models import NlApiScrape
from eval_models import NlGolden
from eval_models import NlQueryEvalScore
from eval_models import NlQueryResponse
from eval_models import VariableResponse
import pandas as pd
from pydantic import BaseModel

_LAST_YEARS_PREP = 'last_years'
_START_DATE_PREPS = ['after', 'since', 'from', _LAST_YEARS_PREP]
_END_DATE_PREPS = ['before', 'by', 'until']
_MIN_MONTH = 1
_EXCLUSIVE_DATE_PREPS = ['before', 'after']
_MIN_DOUBLE_DIGIT_MONTH = 10


def now():
  return datetime.now().strftime("%Y-%m-%d-%H-%M-%S")


def today():
  return dt_date.today().strftime("%Y-%m-%d")


class ClassificationAttributes(ABC):
  """Abstract class to hold classification attributes."""
  pass


@dataclass
class Date:
  """Represents a range of two numeric quantities."""
  prep: str
  year: int
  month: Optional[int] = 0
  year_span: Optional[int] = 0

  def __str__(self):
    return f'{self.year} - {self.month} | {self.year_span}'


@dataclass
class DateClassificationAttributes(ClassificationAttributes):
  dates: List[Date]
  is_single_date: bool

  # List of strings which made this a date query. The order of strings matches
  # the order of dates that it triggered.
  # e.g., "in 2013", "in the last 5 years", "over the past decade", etc.
  date_trigger_strings: List[str]


def _get_month_string(month: int) -> str:
  month_string = ''
  if month >= _MIN_DOUBLE_DIGIT_MONTH:
    month_string = f'-{month}'
  elif month >= _MIN_MONTH:
    month_string = f'-0{month}'
  return month_string


def _get_base_year_month(date: Date) -> Tuple[int, int]:
  base_year = date.year
  base_month = date.month
  # if date range excludes the specified date, need to do some calculations to
  # get the base date.
  if date.prep in _EXCLUSIVE_DATE_PREPS:
    # if specified date is an end date, base date should be earlier than
    # specified date
    if date.prep in _END_DATE_PREPS:
      # if date is monthly, use date that is one month before the specified date
      if base_month >= _MIN_MONTH:
        base_date = datetime.date(base_year, base_month,
                                  1) - relativedelta(months=1)
        base_year = base_date.year
        base_month = base_date.month
      # otherwise, use date that is one year before the specified date
      else:
        base_year = base_year - 1
    # if specified date is a start date, base date should be later than
    # specified date
    elif date.prep in _START_DATE_PREPS:
      # if date is monthly, use date that is one month after the specified date
      if base_month >= _MIN_MONTH:
        base_date = datetime.date(base_year, base_month,
                                  1) + relativedelta(months=1)
        base_year = base_date.year
        base_month = base_date.month
      # otherwise, use date that is one year after the specified date
      else:
        base_year = base_year + 1

  return base_year, base_month


def get_date_range_strings(date: Date) -> Tuple[str, str]:
  start_date = ''
  end_date = ''
  if not date or not date.year:
    return start_date, end_date
  base_year, base_month = _get_base_year_month(date)
  year_string = str(base_year)
  month_string = _get_month_string(base_month)
  base_date = year_string + month_string
  if date.prep in _START_DATE_PREPS:
    start_date = base_date
    if date.year_span > 0:
      end_year = base_year + date.year_span
      end_date = str(end_year) + month_string
  elif date.prep in _END_DATE_PREPS:
    end_date = base_date
    if date.year_span > 0:
      start_year = base_year - date.year_span
      start_date = str(start_year) + month_string
  return start_date, end_date


def scrapes_path(eval_folder: str, file_suffix: str) -> str:
  scrape_file = f'scrape_{file_suffix}' if file_suffix else 'scrape'
  return f'{eval_folder}/{scrape_file}.csv'


def scores_path(eval_folder: str, file_suffix: str) -> str:
  score_file = f'score_{file_suffix}' if file_suffix else 'score'
  return f'{eval_folder}/{score_file}.csv'


def summary_path(eval_folder: str, file_suffix: str) -> str:
  summary_file = f'summary_{file_suffix}' if file_suffix else 'summary'
  return f'{eval_folder}/{summary_file}.csv'


def models_to_csv(csv_path: str, models: List[BaseModel]):
  '''
  This function takes a list of Pydantic models and saves them to a CSV file.

  csv_path: The path where the CSV file will be saved.
  models: A list of Pydantic models to be converted to CSV.
  '''
  df = pd.DataFrame([m.model_dump(mode='json') for m in models])
  df.to_csv(csv_path, index=False)


def df_to_pydantic_models(df: pd.DataFrame,
                          pydantic_model: BaseModel) -> List[BaseModel]:
  '''This function converts each row of a DF into a class object.

  csv_path: The path to the CSV file.
  pydantic_model: The Model Class the csv represents.
  Returns: A list of NlQueryResponse objects.
  '''
  return [
      pydantic_model.model_validate(record)
      for record in df.to_dict(orient='records')
  ]


def df_to_csv(csv_path: str, df: pd.DataFrame, pydantic_model: BaseModel):
  validated_models = df_to_pydantic_models(df, pydantic_model)
  fmt_df = pd.DataFrame([m.model_dump(mode='json') for m in validated_models])
  fmt_df.to_csv(csv_path, index=False)


def csv_to_df(csv_path: str,
              pydantic_model: BaseModel = NlQueryResponse) -> pd.DataFrame:
  '''
  This function reads a CSV file containing golden queries and converts it into
  a pandas DataFrame. It uses converters to properly parse the nested data
  structures within the 'dates', 'places', and 'variables' columns into their
  respective Pydantic models.

  csv_path: The path to the CSV file.
  base_class: This value determines the appropriate converters to use for each column.
  Returns: A pandas DataFrame.
  '''

  converters = {}
  if issubclass(pydantic_model, NlQueryResponse):
    converters = {
        'dates':
            lambda dates:
            [DetectedDate.model_validate(x) for x in ast.literal_eval(dates)],
        'places':
            lambda places:
            [DetectedPlace.model_validate(x) for x in ast.literal_eval(places)],
        'variables':
            lambda vars: [
                VariableResponse.model_validate(x)
                for x in ast.literal_eval(vars)
            ]
    }

  elif pydantic_model is NlQueryEvalScore:
    converters = {
        'golden_response': lambda x: NlGolden(**ast.literal_eval(x)),
        'scraped_response': lambda x: NlApiScrape(**ast.literal_eval(x)),
        'golden_type': GoldenType
    }

  return pd.read_csv(csv_path, converters=converters)
