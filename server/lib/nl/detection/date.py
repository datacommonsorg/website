# Copyright 2023 Google LLC
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

import datetime
import re

from dateutil.relativedelta import relativedelta

from server.lib.nl.common.counters import Counters
from server.lib.nl.detection.types import Date
from server.lib.nl.detection.types import DateClassificationAttributes

YEAR_RE = [
    r'(in|after|on|before|year)(?: year)? (\d{4})',
]

YEARS_AGO_RE = [r'(decade) ago', r'(\d+) years ago']

LAST_YEARS = [
    r'(?:in|during|over) the (?:last|past|previous) (\d+) years',
    r'(?:in|during|over) the (?:last|past|previous) (decade)',
]

LAST_YEAR = [r'(?:in|during|over)(?: the)? (?:last|past|previous) year']

YEAR_MONTH_RE = [
    r'(in|after|on|before|since|by|until|from|between) (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:,)? (\d{4})',
    r'(in|after|on|before|since|by|until|from|between) (\d{4})(?:,)? (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)',
]

# Placeholder prep to use for LAST_YEAR/LAST_YEARS type dates because they do
# not depend on the preposition and should all be treated the same way.
_LAST_YEARS_PREP = 'last_years'
# List of date preps that indicate single date
_SINGLE_DATE_PREPS = ['in', 'on', 'year']
# List of date preps that indicate that the base date is a start date
_START_DATE_PREPS = ['after', 'since', 'from', _LAST_YEARS_PREP]
# List of date preps that indicate that the base date is an end date
_END_DATE_PREPS = ['before', 'by', 'until']
# List of date preps that exclude the base date
_EXCLUSIVE_DATE_PREPS = ['before', 'after']
_MIN_MONTH = 1
_MIN_DOUBLE_DIGIT_MONTH = 10
_YEARS_STRING_TO_NUM = {'decade': 10}


def _is_single_date(dates: list[Date]) -> bool:
  if len(dates) != 1:
    return False
  date = dates[0]
  return date.prep in _SINGLE_DATE_PREPS


def parse_date(query: str, ctr: Counters) -> DateClassificationAttributes:
  dates = []
  trigger_strings = []
  # Looks for matches for a single date of the form YYYY-MM
  for pattern in YEAR_MONTH_RE:
    matches = re.finditer(pattern, query)
    for match in matches:
      prep, month_str, year_str = match.groups()
      year = int(year_str)
      try:
        month = datetime.datetime.strptime(month_str, '%b').month
      except ValueError:
        continue
      dates.append(Date(prep, year, month))
      trigger_strings.append(query[match.start():match.end()])

  # Looks for matches for a single date of the form YYYY
  for pattern in YEAR_RE:
    matches = re.finditer(pattern, query)
    for match in matches:
      prep, year_str = match.groups()
      year = int(year_str)
      dates.append(Date(prep, year))
      trigger_strings.append(query[match.start():match.end()])

  # Looks for matches for a yearly date range that ends in the current year
  for pattern in LAST_YEARS:
    matches = re.finditer(pattern, query)
    for match in matches:
      count, = match.groups()
      count_num = _YEARS_STRING_TO_NUM.get(count, count)
      year = datetime.date.today().year
      # Use a placeholder prep because all last years dates should be treated
      # the same way.
      dates.append(Date(_LAST_YEARS_PREP, year - int(count_num), year_span=0))
      trigger_strings.append(query[match.start():match.end()])

  # Looks for matches for a one year range that ends in the current year
  for pattern in LAST_YEAR:
    matches = re.finditer(pattern, query)
    for match in matches:
      year = datetime.date.today().year
      # Use a placeholder prep because all last year dates should be treated the
      # same way.
      dates.append(Date(_LAST_YEARS_PREP, year - 1, year_span=0))
      trigger_strings.append(query[match.start():match.end()])

  # Looks for matches for a single year that is X years back.
  for pattern in YEARS_AGO_RE:
    matches = re.finditer(pattern, query)
    for match in matches:
      count, = match.groups()
      count_num = _YEARS_STRING_TO_NUM.get(count, count)
      year = datetime.date.today().year - int(count_num)
      dates.append(Date(_SINGLE_DATE_PREPS[0], year))
      trigger_strings.append(query[match.start():match.end()])

  return DateClassificationAttributes(dates=dates,
                                      is_single_date=_is_single_date(dates),
                                      date_trigger_strings=trigger_strings)


def _get_month_string(month: int) -> str:
  month_string = ''
  if month >= _MIN_DOUBLE_DIGIT_MONTH:
    month_string = f'-{month}'
  elif month >= _MIN_MONTH:
    month_string = f'-0{month}'
  return month_string


# Gets the base date as an ISO-8601 formatted string (i.e., YYYY-MM or YYYY)
def get_date_string(date: Date) -> str:
  if not date or not date.year:
    return ''
  year_string = str(date.year)
  month_string = _get_month_string(date.month)
  return year_string + month_string


# Gets the year and month to use as the base date when calculating a date range
def _get_base_year_month(date: Date) -> (int, int):
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


# Gets the date range as 2 ISO-8601 formatted strings (i.e., YYYY-MM or YYYY).
# First string is the start date and the second string is the end date.
def get_date_range_strings(date: Date) -> (str, str):
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
