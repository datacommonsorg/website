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

from server.lib.nl.common.counters import Counters
from server.lib.nl.detection.types import Date
from server.lib.nl.detection.types import DateClassificationAttributes

YEAR_RE = [
    r'(in|after|on|before|year)(?: year)? (\d{4})',
]

LAST_YEARS = [
    r'(?:in|during|over) the (?:last|past|previous) (\d+) years',
    r'(?:in|during|over) the (?:last|past|previous) (decade)',
]

LAST_YEAR = [r'(?:in|during|over)(?: the)? (?:last|past|previous) year']

YEAR_MONTH_RE = [
    r'(in|after|on|before|since|by|until|from|between) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:,)? (\d{4})',
    r'(in|after|on|before|since|by|until|from|between) (\d{4})(?:,)? (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)',
]

# List of date preps that indicate single date
_SINGLE_DATE_PREPS = ['in', 'on']
# List of date preps that indicate that the base date is a start date
_START_DATE_PREPS = ['after', 'since', 'from']
# List of date preps that indicate that the base date is an end date
_END_DATE_PREPS = ['before', 'by', 'until']
_MIN_MONTH = 1
_MIN_DOUBLE_DIGIT_MONTH = 10
_YEARS_STRING_TO_NUM = {'decade': 10}


def _is_single_date(dates: list[Date]) -> bool:
  if len(dates) != 1:
    return False
  date = dates[0]
  if date.year_span == 1:
    return True
  if date.year_span == 0:
    return date.prep in _SINGLE_DATE_PREPS
  return False


def parse_date(query: str, ctr: Counters) -> DateClassificationAttributes:
  dates = []
  trigger_strings = []
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

  for pattern in YEAR_RE:
    matches = re.finditer(pattern, query)
    for match in matches:
      prep, year_str = match.groups()
      year = int(year_str)
      dates.append(Date(prep, year))
      trigger_strings.append(query[match.start():match.end()])

  for pattern in LAST_YEARS:
    matches = re.finditer(pattern, query)
    for match in matches:
      count, = match.groups()
      count_num = _YEARS_STRING_TO_NUM.get(count, count)
      year = datetime.date.today().year
      dates.append(Date('before', year - 1, year_span=int(count_num)))
      trigger_strings.append(query[match.start():match.end()])

  for pattern in LAST_YEAR:
    matches = re.finditer(pattern, query)
    for match in matches:
      year = datetime.date.today().year
      dates.append(Date('before', year - 1, year_span=1))
      trigger_strings.append(query[match.start():match.end()])

  return DateClassificationAttributes(dates=dates,
                                      is_single_date=_is_single_date(dates),
                                      date_trigger_strings=trigger_strings)


def _get_month_string(date: Date) -> str:
  month_string = ''
  if date.month >= _MIN_DOUBLE_DIGIT_MONTH:
    month_string = f'-{date.month}'
  elif date.month >= _MIN_MONTH:
    month_string = f'-0{date.month}'
  return month_string


# Gets the base date as an ISO-8601 formatted string (i.e., YYYY-MM or YYYY)
def get_date_string(date: Date) -> str:
  if not date or not date.year:
    return ''
  year_string = str(date.year)
  month_string = _get_month_string(date)
  return year_string + month_string


# Gets the date range as 2 ISO-8601 formatted strings (i.e., YYYY-MM or YYYY).
# First string is the start date and the second string is the end date.
def get_date_range(date: Date) -> (str, str):
  start_date = ''
  end_date = ''
  if not date or not date.year:
    return start_date, end_date
  year_string = str(date.year)
  month_string = _get_month_string(date)
  base_date = year_string + month_string
  if date.prep in _START_DATE_PREPS:
    start_date = base_date
    if date.year_span > 0:
      # The year span includes start and end years so add year span - 1.
      end_year = date.year + (date.year_span - 1)
      end_date = str(end_year) + month_string
  elif date.prep in _END_DATE_PREPS:
    end_date = base_date
    if date.year_span > 0:
      # The year span includes start and end years so subtract year span - 1.
      start_year = date.year - (date.year_span - 1)
      start_date = str(start_year) + month_string
  return start_date, end_date