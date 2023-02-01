# Copyright 2022 Google LLC
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
"""Date Detection."""

from typing import List

from dateutil import parser

_MIN_HIGH_CONF_DETECT: float = 0.9


def _detect_date(header: str) -> bool:
  """Date is detected if header is a valid ISO-8601 format.
  Note: since we are only interested in detecting dates (and not time),
  if the header string length is <= 3, we consider that to be invalid.
  """
  try:
    parser.isoparse(header)
    return len(header) > 3
  except Exception:
    # Any exception means we couldn't parse header as a date.
    return False


def detect_column_header(header: str) -> bool:
  """Returns true if 'header' can be parsed as valid Datetime object."""
  return _detect_date(header)


def detect_column_with_dates(col_values: List[str]) -> bool:
  """Returns True if the proportion of 'col_values' detected as date is
  greater than _MIN_HIGH_CONF_DETECT of the non-empty string 'col_values'.
  It returns False otherwise.
  """
  num_detected = 0
  total = 0

  for dt in col_values:
    if dt:
      total += 1
      if _detect_date(dt):
        num_detected += 1

  return num_detected > _MIN_HIGH_CONF_DETECT * total
