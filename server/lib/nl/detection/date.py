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
    r'(?:in|during) the (?:last|past|previous) (\d+) years',
]

LAST_YEAR = [r'(?:in|during)(?: the)? (?:last|past|previous) year']

YEAR_MONTH_RE = [
    r'(in|after|on|before|since|by|util|from|between) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:,)? (\d{4})',
    r'(in|after|on|before|since|by|util|from|between) (\d{4})(?:,)? (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)',
]

# List of date preps that indicate single date
_SINGLE_DATE_PREPS = ['in', 'on']
_MIN_MONTH = 1
_MIN_DOUBLE_DIGIT_MONTH = 10


def is_single_date(dates: list[Date]) -> bool:
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

  for pattern in YEAR_RE:
    matches = re.finditer(pattern, query)
    for match in matches:
      prep, year_str = match.groups()
      year = int(year_str)
      dates.append(Date(prep, year))

  for pattern in LAST_YEARS:
    matches = re.finditer(pattern, query)
    for match in matches:
      count, = match.groups()
      year = datetime.date.today().year
      dates.append(Date('before', year - 1, year_span=int(count)))

  for pattern in LAST_YEAR:
    matches = re.finditer(pattern, query)
    for match in matches:
      year = datetime.date.today().year
      dates.append(Date('before', year - 1, year_span=1))

  return DateClassificationAttributes(dates=dates,
                                      is_single_date=is_single_date(dates))


# Gets the date as an ISO-8601 formatted string (i.e., YYYY-MM or YYYY)
def get_date_string(date: Date) -> str:
  if not date or not date.year:
    return ''
  year_string = str(date.year)
  month_string = ''
  if date.month >= _MIN_DOUBLE_DIGIT_MONTH:
    month_string = f'-{date.month}'
  elif date.month >= _MIN_MONTH:
    month_string = f'-0{date.month}'
  return year_string + month_string
